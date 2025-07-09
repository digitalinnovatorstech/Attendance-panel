from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Case, When, IntegerField
from .models_chat import ChatRoom, Message, UserStatus
from .serializers_chat import ChatRoomSerializer, MessageSerializer, UserSerializer
from rest_framework.permissions import IsAuthenticated

User = get_user_model()

class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Admin can see all chat rooms, employees can only see their own
        if self.request.user.is_staff:
            return ChatRoom.objects.filter(admin=self.request.user).select_related('employee')
        return ChatRoom.objects.filter(employee=self.request.user).select_related('admin')
    
    def get_serializer_context(self):
        return {'request': self.request}
    
    @action(detail=False, methods=['get'])
    def employees(self, request):
        """List all employees that the admin can chat with"""
        if not request.user.is_staff:
            return Response(
                {"detail": "Only admins can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all employees except the current admin
        employees = User.objects.filter(
            is_staff=False,
            is_active=True
        ).exclude(id=request.user.id)
        
        # Get existing chat rooms
        existing_rooms = ChatRoom.objects.filter(
            admin=request.user,
            employee__in=employees
        ).values_list('employee_id', flat=True)
        
        # Create rooms for employees without one
        employees_to_create = employees.exclude(id__in=existing_rooms)
        new_rooms = [
            ChatRoom(admin=request.user, employee=emp)
            for emp in employees_to_create
        ]
        if new_rooms:
            ChatRoom.objects.bulk_create(new_rooms)
        
        # Return all chat rooms
        rooms = self.get_queryset()
        serializer = self.get_serializer(rooms, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get all messages in a chat room"""
        chat_room = self.get_object()
        messages = chat_room.messages.all().select_related('sender')
        
        # Mark messages as read if they're from the other user
        if messages.exists():
            other_user = chat_room.employee if request.user == chat_room.admin else chat_room.admin
            unread_messages = messages.filter(sender=other_user, is_read=False)
            if unread_messages.exists():
                unread_messages.update(is_read=True)
        
        serializer = MessageSerializer(
            messages,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

class UserStatusViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get online status of users"""
        user_ids = request.query_params.get('user_ids', '').split(',')
        if user_ids == ['']:
            return Response({"detail": "No user_ids provided"}, status=400)
            
        statuses = UserStatus.objects.filter(user_id__in=user_ids)
        data = {
            str(status.user_id): {
                'is_online': status.is_online,
                'last_seen': status.last_seen
            }
            for status in statuses
        }
        return Response(data)
    
    @action(detail=False, methods=['post'])
    def update_status(self, request):
        """Update user's online status"""
        is_online = request.data.get('is_online', False)
        user_status, _ = UserStatus.objects.get_or_create(user=request.user)
        user_status.is_online = is_online
        user_status.save()
        return Response({"status": "success"})

# WebSocket URL routing
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
