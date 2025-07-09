from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models_chat import ChatRoom, Message, UserStatus

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'status']
        read_only_fields = ['email', 'first_name', 'last_name']
    
    def get_status(self, obj):
        try:
            return 'online' if obj.chat_status.is_online else 'offline'
        except UserStatus.DoesNotExist:
            return 'offline'

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'timestamp', 'is_read', 'is_me']
        read_only_fields = ['id', 'timestamp', 'is_read', 'is_me']
    
    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.sender == request.user
        return False

class ChatRoomSerializer(serializers.ModelSerializer):
    employee = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'employee', 'created_at', 'updated_at', 'last_message', 'unread_count']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if last_message:
            return MessageSerializer(last_message, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
