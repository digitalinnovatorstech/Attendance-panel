from rest_framework import viewsets, status, permissions, filters, generics
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.utils.dateparse import parse_time  # Add this import for time parsing
from django.conf import settings

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_email(request):
    """Test email configuration"""
    try:
        send_mail(
            'Test Email',
            'This is a test email from your Django application.',
            settings.DEFAULT_FROM_EMAIL,
            ['shaikhsharim404@gmail.com'],  # Replace with your test email
            fail_silently=False,
        )
        return Response({"message": "Test email sent successfully!"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate, get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta, datetime, time
from django.urls import reverse
from django.shortcuts import get_object_or_404
from rest_framework import status

User = get_user_model()
from django.db.models import Q, F, ExpressionWrapper, DurationField, Sum
from django.db.models.functions import TruncDate
import secrets
import string
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Group
from .models import Employee, LateLoginReason, DailyWorkReport, AttendanceLog, AdminReply, AttendancePunchInOut
from .models import PasswordResetToken
from .serializers import (
    EmployeeSerializer, 
    UserSerializer, 
    LateLoginReasonSerializer,
    DailyWorkReportSerializer,
    AttendanceLogSerializer,
    EmployeeWithReportSerializer,
    EmployeeSearchSerializer,
    AdminReplySerializer, AttendancePunchInOutSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)
from django.utils.dateparse import parse_date
from django.db.models.functions import Now, TruncDate
from django.db.models import Q
import pytz

import logging
logger = logging.getLogger(__name__)

class LogoutView(APIView):
    # Disable all authentication and permission checks
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {"error": "Refresh token is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Just return success - tokens will expire naturally
            # If you need token blacklisting, you'll need to:
            # 1. Add 'rest_framework_simplejwt.token_blacklist' to INSTALLED_APPS
            # 2. Run python manage.py migrate
            return Response(
                {"message": "Successfully logged out (token will expire naturally)"}, 
                status=status.HTTP_205_RESET_CONTENT
            )
            
        except Exception as e:
            # Log the error but still return success
            logger.error(f"Error during logout: {str(e)}")
            return Response(
                {"message": "Successfully logged out"}, 
                status=status.HTTP_205_RESET_CONTENT
            )


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        logger.info(f"Login attempt with data: {request.data}")
        email = request.data.get('email')
        default_password =request.data.get("password") #'Pass@123'  # Default password for all users
        
        if not email:
            logger.error("No email provided in request")
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to get the user by email
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            
            # If user exists but authentication fails, update password to default
            if not user.check_password(default_password):
               # user.set_password(default_password)
                return Response({"error": "Invalid Password"}, status=status.HTTP_400_BAD_REQUEST)
                user.save()
                logger.info(f"Password reset to default for user: {email}")
            
            # Now authenticate with default password
            user = authenticate(request, username=email, password=default_password)
            
            if user is not None:
                refresh = RefreshToken.for_user(user)
                logger.info(f"Login successful for user: {email}")
                return Response({
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.get_full_name()
                    }
                })
            
        except User.DoesNotExist:
            logger.warning(f"User not found: {email}")
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        logger.warning(f"Login failed for email: {email}")
        return Response({"error": "Login failed"}, status=status.HTTP_401_UNAUTHORIZED)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.filter(email=email).first()
            # Create a reset token (you might want to use a more secure method in production)
            token = get_random_string(40)
            user.reset_password_token = token
            user.reset_password_expires = timezone.now() + timedelta(hours=24)
            user.save()
            
            # Send email with reset link
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}/"
            send_mail(
                'Password Reset Request',
                f'Click the link to reset your password: {reset_url}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return Response({'message': 'Password reset link sent to your email'})
        except User.DoesNotExist:
            return Response({'error': 'User with this email does not exist'}, status=400)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, token):
        new_password = request.data.get('new_password')
        try:
            user = User.objects.get(
                reset_password_token=token,
                reset_password_expires__gt=timezone.now()
            )
            user.set_password(new_password)
            user.reset_password_token = None
            user.reset_password_expires = None
            user.save()
            return Response({'message': 'Password reset successful'})
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=400)


class CanSubmitLateLoginReason(permissions.BasePermission):
    """
    Custom permission to only allow users to submit late login reasons.
    Regular users can only POST, while admins have full access.
    """
    def has_permission(self, request, view):
        # Allow all authenticated users to POST
        if request.method == 'POST':
            return request.user and request.user.is_authenticated
        # Only allow admin users for other methods (GET, PUT, DELETE, etc.)
        return request.user and (request.user.is_staff or request.user.is_superuser)


class LateLoginReasonViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing late login reasons.
    - Regular users can only submit (POST) late login reasons
    - Admin users can view and manage all late login reasons
    """
    serializer_class = LateLoginReasonSerializer
    permission_classes = [IsAuthenticated, CanSubmitLateLoginReason]
    
    def get_queryset(self):
        # For admin users, return all late login reasons with related employee data
        if self.request.user.is_staff or self.request.user.is_superuser:
            return LateLoginReason.objects.all()\
                .select_related('employee__user', 'approved_by')\
                .order_by('-login_time')
        
        # For regular users, return an empty queryset since they can't list reasons
        return LateLoginReason.objects.none()
    
    def list(self, request, *args, **kwargs):
        # If it's not an admin, return 403 Forbidden
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "You do not have permission to view late login reasons"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Handle pagination for admin users
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error listing late login reasons: {str(e)}")
            return Response(
                {"error": "An error occurred while retrieving late login reasons"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Check if the requesting user is the owner or an admin
        if not (request.user.is_staff or request.user.is_superuser) and instance.employee.user != request.user:
            return Response(
                {"error": "You do not have permission to view this late login reason"},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        # Get the employee associated with the logged-in user
        try:
            employee = Employee.objects.get(user=self.request.user)
        except Employee.DoesNotExist:
            raise ValidationError("No employee profile found for this user")
            
        # Set the employee and login time
        serializer.save(
            employee=employee, 
            login_time=timezone.now()
        )
        
    def create(self, request, *args, **kwargs):
        # Ensure non-admin users can't create reasons for others
        if 'employee' in request.data and not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "You can only create late login reasons for yourself"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        logger.debug(f"Creating late login reason for user: {request.user.id}")
        logger.debug(f"Request data: {request.data}")
        
        try:
            # Get the employee for the current user
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                return Response(
                    {"error": "No employee profile found for this user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Prepare the data
            data = request.data.copy()
            data['employee'] = employee.id
            
            # Validate required fields
            if 'reason' not in data or not data['reason'].strip():
                return Response(
                    {"reason": ["This field is required."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Parse expected_time if provided
            expected_time = None
            if 'expected_time' in data and data['expected_time']:
                try:
                    expected_time = parse_time(data['expected_time'])
                    if not expected_time:
                        raise ValueError("Invalid time format")
                except (ValueError, TypeError):
                    return Response(
                        {"expected_time": ["Invalid time format. Use HH:MM:SS."]},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create the late login reason
            late_reason = LateLoginReason.objects.create(
                employee=employee,
                reason=data['reason'].strip(),
                expected_time=expected_time,
                login_time=timezone.now()
            )
            
            # Log the creation
            logger.info(f"Late login reason created successfully for user {request.user.id}")
            
            # Return the created object
            serializer = self.get_serializer(late_reason)
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
            
        except Exception as e:
            error_msg = f"Error creating late login reason: {str(e)}"
            logger.error(f"{error_msg}\n{str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while creating the late login reason"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        return [IsAuthenticated()]  # All actions require authentication
        
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Check if the requesting user is the owner or an admin
        if not (request.user.is_staff or request.user.is_superuser) and instance.employee.user != request.user:
            return Response(
                {"error": "You do not have permission to update this late login reason"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
        
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Check if the requesting user is the owner or an admin
        if not (request.user.is_staff or request.user.is_superuser) and instance.employee.user != request.user:
            return Response(
                {"error": "You do not have permission to delete this late login reason"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class ApproveLateLoginView(APIView):
    permission_classes = [IsAuthenticated]  # Require authentication
    
    def post(self, request, reason_id):
        try:
            # Get the late login reason and ensure it belongs to the logged-in user
            reason = LateLoginReason.objects.select_related('employee__user').get(
                id=reason_id,
                employee__user=request.user  # Ensure the reason belongs to the logged-in user
            )
            
            # Accept both 'approved' and 'is_approved' for backward compatibility
            is_approved = request.data.get('approved')
            if is_approved is None:
                is_approved = request.data.get('is_approved')
            
            if is_approved is None:
                return Response(
                    {'error': 'approved field is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the status
            reason.is_approved = is_approved
            # Store who approved it (the logged-in user)
            # Since approved_by expects a User instance, we'll use request.user directly
            reason.approved_by = request.user
                
            reason.save()
            
            return Response({
                'id': reason.id,
                'employee': reason.employee.id if reason.employee else None,
                'approved': reason.is_approved,
                'approved_by': reason.approved_by.id if reason.approved_by else None,
                'message': f'Late login has been {"approved" if reason.is_approved else "rejected"}'
            })
            
        except LateLoginReason.DoesNotExist:
            return Response(
                {'error': 'Late login reason not found or you do not have permission to approve it'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error approving late login: {str(e)}")
            return Response(
                {'error': 'An error occurred while processing your request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


import logging
logger = logging.getLogger(__name__)

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admin users to perform certain actions.
    - Admin users can perform any action (GET, POST, etc.)
    - Regular users can only create reports (POST)
    """
    def has_permission(self, request, view):
        # Allow all authenticated users to create reports (POST)
        if request.method == 'POST':
            return bool(request.user and request.user.is_authenticated)
        # Only allow admin users for other methods (GET, PUT, DELETE, etc.)
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))


class DailyWorkReportViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing daily work reports.
    - Regular users can submit reports (POST)
    - Only admin users can view all reports (GET)
    """
    serializer_class = DailyWorkReportSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        logger.debug(f"DailyWorkReportViewSet {request.method} accessed by user {request.user.id} (Admin: {request.user.is_staff or request.user.is_superuser}")
    
    def get_queryset(self):
        """
        Return queryset based on user type:
        - Admin: All reports
        - Regular user: Only their own reports
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            logger.info(f"Admin {self.request.user.id} accessing all daily work reports")
            return DailyWorkReport.objects.all()\
                .select_related('employee__user')\
                .order_by('-date')
        
        logger.info(f"User {self.request.user.id} accessing their own daily work reports")
        return DailyWorkReport.objects.filter(
            employee__user=self.request.user
        ).order_by('-date')
    
    def list(self, request, *args, **kwargs):
        """
        List daily work reports.
        - Admin: All reports
        - Regular users: Only their own reports
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Add pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'count': queryset.count(),
                'results': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error listing daily work reports: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while retrieving the reports"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            logger.debug(f"Creating daily work report for user {request.user.id}")
            
            # Get the employee associated with the logged-in user
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                logger.error(f"No employee profile found for user {request.user.id}")
                return Response(
                    {"error": "No employee profile found for this user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Prepare data with the authenticated employee's ID
            data = request.data.copy()
            data['employee'] = employee.id
            
            # Parse the date from request or use today's date
            report_date = None
            if 'date' in data and data['date']:
                try:
                    report_date = parse_date(data['date'])
                    if not report_date:
                        raise ValueError("Invalid date format")
                except (ValueError, TypeError):
                    return Response(
                        {"date": ["Invalid date format. Use YYYY-MM-DD."]},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                report_date = timezone.now().date()
                data['date'] = report_date.isoformat()
            
            # Check if a report already exists for this employee and date
            existing_report = DailyWorkReport.objects.filter(
                employee=employee,
                date=report_date
            ).first()
            
            if existing_report:
                logger.warning(f"Daily work report already exists for user {request.user.id} on {report_date}")
                return Response(
                    {
                        "error": "A daily work report already exists for this date.",
                        "existing_report_id": existing_report.id,
                        "date": existing_report.date.isoformat(),
                        "status": existing_report.status
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate work_details is provided and not empty
            work_details = data.get('work_details', '').strip()
            if not work_details:
                logger.warning(f"Missing work_details in request from user {request.user.id}")
                return Response(
                    {"work_details": ["This field is required."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the report
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Save the report with the employee and status
            try:
                self.perform_create(serializer)
                logger.info(f"Daily work report created successfully for user {request.user.id}")
                
                headers = self.get_success_headers(serializer.data)
                return Response(
                    serializer.data, 
                    status=status.HTTP_201_CREATED, 
                    headers=headers
                )
                
            except Exception as e:
                logger.error(f"Error saving daily work report for user {request.user.id}: {str(e)}")
                if 'duplicate key' in str(e):
                    return Response(
                        {"error": "A daily work report already exists for this date."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                raise
            
        except Exception as e:
            error_msg = f"Error creating daily work report: {str(e)}"
            logger.error(f"{error_msg}\n{str(e)}", exc_info=True)
            
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                # Handle DRF validation errors
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
                
            return Response(
                {"error": "An error occurred while creating the report. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        # Get the employee associated with the logged-in user
        employee = Employee.objects.get(user=self.request.user)
        # Set status to 'sent' when report is submitted
        serializer.save(employee=employee, status='sent')


class DebugEmployees(APIView):
    permission_classes = []
    authentication_classes = []
    
    def get(self, request, *args, **kwargs):
        """Debug endpoint to list all employees"""
        try:
            employees = Employee.objects.all().values('id', 'email', 'status')
            return Response({
                'count': employees.count(),
                'employees': list(employees)
            })
        except Exception as e:
            return Response({
                'error': str(e),
                'type': type(e).__name__
            }, status=500)

# Function-based view for the debug endpoint
debug_employees = DebugEmployees.as_view()

class PunchInOutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AttendancePunchInOutSerializer
    
    def post(self, request):
        """
        Handle punch in/out requests.
        If user is not punched in, creates a punch in record.
        If user is already punched in, creates a punch out record.
        """
        employee = request.user.employee
        now = timezone.now()
        today = now.date()
        
        # Check if there's an open punch in (no punch out)
        open_punch = AttendancePunchInOut.objects.filter(
            employee=employee,
            date=today,
            punch_out__isnull=True
        ).order_by('-punch_in').first()
        
        if open_punch:
            # Punch out
            serializer = self.serializer_class(data={
                'event_type': 'punch_out',
                'timestamp': now
            }, context={'request': request})
            
            if serializer.is_valid():
                # Update the punch in record with punch out time
                time_diff = now - open_punch.punch_in
                hours_worked = round(time_diff.total_seconds() / 3600, 2)
                
                open_punch.punch_out = now
                open_punch.hours_worked = hours_worked
                open_punch.save()
                
                # Update employee status
                employee.status = 'offline'
                employee.logout_time = now
                employee.hours_worked = hours_worked
                employee.save()
                
                return Response({
                    'status': 'success',
                    'message': 'Punched out successfully',
                    'punch_type': 'out',
                    'timestamp': now,
                    'hours_worked': hours_worked
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Punch in
            serializer = self.serializer_class(data={
                'event_type': 'punch_in',
                'timestamp': now,
                'late_reason': request.data.get('late_reason', '')
            }, context={'request': request})
            
            if serializer.is_valid():
                # Check if late (after 9:30 AM)
                is_late = now.time() > time(9, 30)
                
                # Create punch in record
                attendance = AttendancePunchInOut.objects.create(
                    employee=employee,
                    event_type='punch_in',
                    timestamp=now,
                    is_late=is_late,
                    late_reason=request.data.get('late_reason', '') if is_late else ''
                )
                
                # Update employee status
                employee.status = 'online'
                employee.login_time = now
                employee.save()
                
                response_data = {
                    'status': 'success',
                    'message': 'Punched in successfully',
                    'punch_type': 'in',
                    'timestamp': now,
                    'is_late': is_late
                }
                
                if is_late:
                    response_data['message'] = 'Punched in late. Reason submitted.'
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        """
        Get the current punch status for the authenticated user.
        Returns whether the user is currently punched in or out.
        """
        employee = request.user.employee
        today = timezone.now().date()
        
        # Get today's punch in (if any)
        today_punch = AttendancePunchInOut.objects.filter(
            employee=employee,
            timestamp__date=today,
            event_type='punch_in'
        ).order_by('-timestamp').first()
        
        if not today_punch:
            return Response({
                'status': 'not_punched_in',
                'message': 'Not punched in today',
                'punch_type': None,
                'timestamp': None,
                'hours_worked': 0,
                'is_late': False
            })
        
        # Check if punched out
        if today_punch.punch_out:
            return Response({
                'status': 'punched_out',
                'message': 'Punched out',
                'punch_type': 'out',
                'punch_in': today_punch.timestamp,
                'punch_out': today_punch.punch_out,
                'hours_worked': float(today_punch.hours_worked or 0),
                'is_late': today_punch.is_late,
                'late_reason': today_punch.late_reason if today_punch.is_late else None
            })
        
        # Still punched in
        hours_worked = (timezone.now() - today_punch.timestamp).total_seconds() / 3600
        
        return Response({
            'status': 'punched_in',
            'message': 'Currently punched in',
            'punch_type': 'in',
            'punch_in': today_punch.timestamp,
            'punch_out': None,
            'hours_worked': round(hours_worked, 2),
            'is_late': today_punch.is_late,
            'late_reason': today_punch.late_reason if today_punch.is_late else None
        })


class AdminEmployeeReportView(APIView):
    """
    Admin-only API endpoint to view all employees with their attendance and daily report status.
    
    This view is restricted to admin users only and provides a comprehensive overview
    of employee activities including login/logout times and daily report submissions.
    
    Authentication: JWT Token Required
    Permissions: Staff or Superuser
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get a list of all employees with their daily report status
        
        Returns:
            - 200: JSON response with employee data and report status
            - 403: If user is not an admin
            - 500: For any server errors
        """
        try:
            # Check if user is admin (staff or superuser)
            if not (request.user.is_staff or request.user.is_superuser):
                logger.warning(f"Unauthorized access attempt by user {request.user.id}")
                return Response(
                    {
                        "error": "Access Denied",
                        "message": "You do not have permission to access this resource"
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            logger.info(f"Admin report accessed by user {request.user.id}")
            today = timezone.now().date()
            
            # Get all active employees with their related user data
            employees = Employee.objects.filter(
                user__is_active=True
            ).select_related('user').order_by('user__first_name', 'user__last_name')
            
            if not employees.exists():
                return Response({
                    'date': today.isoformat(),
                    'count': 0,
                    'reports': [],
                    'message': 'No active employees found'
                })
            
            # Get all reports for today with related employee data
            today_reports = DailyWorkReport.objects.filter(
                date=today
            ).select_related('employee__user')
            
            # Create a dictionary of employee_id -> report status for quick lookup
            report_status = {}
            for report in today_reports:
                report_status[report.employee_id] = {
                    'status': report.status,
                    'submitted_at': report.created_at,
                    'work_details': report.work_details[:100] + '...' if report.work_details else '',
                    'report_id': report.id
                }
            
            # Prepare response data with employee information
            result = []
            for employee in employees:
                # Skip if employee has no associated user
                if not hasattr(employee, 'user'):
                    continue
                    
                employee_data = {
                    'employee_id': employee.id,
                    'user_id': employee.user.id,
                    'name': f"{employee.user.first_name or ''} {employee.user.last_name or ''}".strip() or 'No Name',
                    'email': employee.user.email,
                    'status': employee.status or 'inactive',
                    'login_time': employee.login_time.isoformat() if employee.login_time else None,
                    'logout_time': employee.logout_time.isoformat() if employee.logout_time else None,
                    'last_login': employee.user.last_login.isoformat() if employee.user.last_login else None,
                    'daily_report': {
                        'status': 'pending',  # Default status
                        'submitted_at': None,
                        'work_details': None,
                        'report_id': None
                    }
                }
                
                # Update with report status if exists
                if employee.id in report_status:
                    employee_data['daily_report'] = {
                        'status': report_status[employee.id]['status'],
                        'submitted_at': report_status[employee.id]['submitted_at'].isoformat() if report_status[employee.id]['submitted_at'] else None,
                        'work_details': report_status[employee.id]['work_details'],
                        'report_id': report_status[employee.id]['report_id']
                    }
                    
                result.append(employee_data)
            
            return Response({
                'date': today.isoformat(),
                'count': len(result),
                'reports': result,
                'message': 'Successfully retrieved employee reports'
            })
            
        except Exception as e:
            logger.error(f"Error in AdminEmployeeReportView: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Internal Server Error',
                    'message': 'An error occurred while processing your request',
                    'details': str(e) if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        

class EmployeeSearchView(APIView):
    """
    API endpoint for searching employees by name and filtering by report status
    """
    permission_classes = []
    authentication_classes = []
    
    def get(self, request):
        try:
            print("\n=== EmployeeSearchView Called ===")
            print("Request URL:", request.build_absolute_uri())
            print("Query Params:", dict(request.query_params))
            print("Request Method:", request.method)
            print("Request Headers:", dict(request.headers))
            print("=" * 50 + "\n")
            
            # Get query parameters
            search_query = request.query_params.get('search', '').strip()
            status_filter = request.query_params.get('status', '').lower()
            
            # Start with all employees
            employees = Employee.objects.select_related('user').all()
            print(f"Total employees: {employees.count()}")
            
            # Apply search filter (name or email)
            if search_query:
                print(f"Applying search filter: {search_query}")
                employees = employees.filter(
                    Q(user__first_name__icontains=search_query) |
                    Q(user__last_name__icontains=search_query) |
                    Q(user__email__icontains=search_query)
                )
                print(f"Employees after search: {employees.count()}")
            
            # Apply status filter
            if status_filter in ['sent', 'pending']:
                print(f"Applying status filter: {status_filter}")
                today = timezone.now().date()
                if status_filter == 'sent':
                    # Get employees who have submitted reports today
                    employees_with_reports = DailyWorkReport.objects.filter(
                        date=today
                    ).values_list('employee_id', flat=True)
                    employees = employees.filter(id__in=employees_with_reports)
                else:  # pending
                    # Get employees who haven't submitted reports today
                    employees_with_reports = DailyWorkReport.objects.filter(
                        date=today
                    ).values_list('employee_id', flat=True)
                    employees = employees.exclude(id__in=employees_with_reports)
                print(f"Employees after status filter: {employees.count()}")
            
            # Serialize the results
            serializer = EmployeeSearchSerializer(employees, many=True)
            
            return Response({
                'count': employees.count(),
                'results': serializer.data
            })
            
        except Exception as e:
            print(f"Error in EmployeeSearchView: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminReplyView(APIView):
    """
    API endpoint for posting replies to daily work reports
    Only accessible by admin users
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, report_id):
        # Check if user is admin
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "You do not have permission to access this resource"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            # Get the report with related employee data
            report = DailyWorkReport.objects.select_related('employee__user').get(id=report_id)
        except DailyWorkReport.DoesNotExist:
            return Response(
                {"error": "Daily work report not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate request data
        serializer = AdminReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Update the report with admin's reply
            report.admin_reply = serializer.validated_data.get('message')
            report.replied_by = request.user  # Current admin user
            report.replied_at = timezone.now()
            report.save()
            
            # Create a new reply record
            reply = AdminReply.objects.create(
                report=report,
                admin=request.user,
                message=serializer.validated_data.get('message')
            )
            
            # Prepare email content
            employee_email = report.employee.user.email
            employee_name = report.employee.user.get_full_name() or 'Employee'
            subject = f"Reply to your daily report - {report.date}"
            
            message = f"""
            Hello {employee_name},
            
            You have received a reply from the admin regarding your daily work report for {report.date}.
            
            Your Work Details:
            {report.work_details}
            
            Admin's Reply:
            {report.admin_reply}
            
            Regards,
            Admin Team
            """
            
            # Send email to employee
            try:
                send_mail(
                    subject=subject,
                    message=message.strip(),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[employee_email],
                    fail_silently=False,
                )
                logger.info(f"Reply email sent to {employee_email}")
            except Exception as e:
                logger.error(f"Failed to send email to {employee_email}: {str(e)}")
            
            # Return the reply data
            return Response({
                'id': reply.id,
                'report_id': report.id,
                'admin_name': request.user.get_full_name() or 'Admin',
                'message': reply.message,
                'created_at': reply.created_at,
                'email_sent': True,
                'employee_email': employee_email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating admin reply: {str(e)}")
            return Response(
                {"error": "An error occurred while processing your request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PunchInView(APIView):
    """
    API for employees to punch in
    """
    permission_classes = []
    
    def post(self, request, employee_id):
        try:
            employee = Employee.objects.get(id=employee_id)
            now = timezone.now()
            today = now.date()
            
            # Check if already punched in today
            existing_record = AttendancePunchInOut.objects.filter(
                employee=employee,
                date=today,
                punch_out__isnull=True
            ).first()
            
            if existing_record:
                return Response(
                    {"error": "You have already punched in today"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if punch in is after 9:30 AM
            late_time = timezone.datetime.combine(today, time(9, 30)).replace(tzinfo=timezone.get_current_timezone())
            is_late = now > late_time
            reason = request.data.get('reason', '')
            
            # If late and no reason provided, return error
            if is_late and not reason:
                return Response(
                    {"error": "Reason is required for late punch-in (after 9:30 AM)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create new punch in record
            record = AttendancePunchInOut.objects.create(
                employee=employee,
                date=today,
                punch_in=now,
                reason=reason if reason else (None if not is_late else ''),
                status='Late' if is_late else 'Present'
            )
            
            serializer = AttendancePunchInOutSerializer(record)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class PunchOutView(APIView):
    """
    API for employees to punch out
    """
    permission_classes = []
    
    def post(self, request, employee_id):
        try:
            employee = Employee.objects.get(id=employee_id)
            now = timezone.now()
            today = now.date()
            
            # Get the latest punch in record without punch out
            record = AttendancePunchInOut.objects.filter(
                employee=employee,
                date=today,
                punch_out__isnull=True
            ).order_by('-punch_in').first()
            
            if not record:
                return Response(
                    {"error": "No active punch in found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if it's after 6:30 PM (18:30)
            if now.hour >= 18 and now.minute >= 30:
                reason = request.data.get('reason')
                if not reason or not reason.strip():
                    return Response(
                        {"error": "Reason is required when punching out after 6:30 PM"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                record.reason = reason
            
            # Update punch out time and save
            record.punch_out = now
            record.save()
            
            # Create attendance log entry
            AttendanceLog.objects.create(
                employee=employee,
                event_type='punch_out',
                timestamp=now,
                reason=record.reason if hasattr(record, 'reason') else None
            )
            
            serializer = AttendancePunchInOutSerializer(record)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class HRAttendanceView(APIView):
    """
    API for HR to view all employee attendance records
    """
    permission_classes = []
    
    def get(self, request):
        try:
            # Get query parameters
            employee_id = request.query_params.get('employee_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Build query
            query = {}
            if employee_id:
                query['employee_id'] = employee_id
            if start_date:
                query['date__gte'] = start_date
            if end_date:
                query['date__lte'] = end_date
            
            # Get records
            records = AttendancePunchInOut.objects.filter(**query).order_by('-date', '-punch_in')
            
            # Serialize data
            serializer = AttendancePunchInOutSerializer(records, many=True)
            return Response({
                'count': len(serializer.data),
                'results': serializer.data
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

import logging

logger = logging.getLogger(__name__)

# class PasswordResetRequestView(APIView):
#     """
#     API endpoint to request password reset link
#     """
#     permission_classes = []
    
#     def post(self, request):
#         logger.info("Password reset request received")
#         serializer = PasswordResetRequestSerializer(data=request.data)
#         if not serializer.is_valid():
#             logger.error(f"Validation error: {serializer.errors}")
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
#         email = serializer.validated_data['email']
#         logger.info(f"Processing password reset for email: {email}")
        
#         try:
#             user = User.objects.get(email=email)
#             logger.info(f"User found: {user.username}")
#         except User.DoesNotExist:
#             # For security reasons, don't reveal if email exists or not
#             logger.warning(f"Password reset attempt for non-existent email: {email}")
#             return Response(
#                 {"message": "If this email exists, a password reset link has been sent"},
#                 status=status.HTTP_200_OK
#             )
        
#         try:
#             # Generate a secure token
#             token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(64))
            
#             # Set token expiry (24 hours from now)
#             expires_at = timezone.now() + timedelta(hours=24)
            
#             # Create or update token
#             PasswordResetToken.objects.filter(user=user).update(is_used=True)
#             PasswordResetToken.objects.create(
#                 user=user,
#                 token=token,
#                 expires_at=expires_at
#             )
#             logger.info("Password reset token created")
            
#             # Prepare email
#             reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
#             subject = 'Password Reset Request'
#             message = f'''
#             You're receiving this email because you requested a password reset for your account.
            
#             Please go to the following page and choose a new password:
#             {reset_link}
            
#             This link will expire in 24 hours.
            
#             If you didn't request this, please ignore this email.
#             '''
            
#             try:
#                 logger.info(f"Sending password reset email to {user.email}")
#                 send_mail(
#                     subject=subject,
#                     message=message.strip(),
#                     from_email=settings.DEFAULT_FROM_EMAIL,
#                     recipient_list=[user.email],
#                     fail_silently=False,
#                 )
#                 logger.info("Password reset email sent successfully")
                
#                 return Response(
#                     {"message": "If this email exists, a password reset link has been sent"},
#                     status=status.HTTP_200_OK
#                 )
                
#             except Exception as e:
#                 logger.error(f"Failed to send password reset email: {str(e)}", exc_info=True)
#                 return Response(
#                     {"error": "Failed to send password reset email. Please try again later."},
#                     status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                 )
                
#         except Exception as e:
#             logger.error(f"Error processing password reset request: {str(e)}", exc_info=True)
#             return Response(
#                 {"error": "An error occurred while processing your request. Please try again."},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


class PasswordResetConfirmView(APIView):
    """
    API endpoint to confirm password reset
    """
    permission_classes = []
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            reset_token = PasswordResetToken.objects.get(
                token=token,
                is_used=False,
                expires_at__gt=timezone.now()
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.mark_as_used()
        
        return Response(
            {"message": "Password has been reset successfully"},
            status=status.HTTP_200_OK
        )


class AdminReplyToReportView(APIView):
    """
    API endpoint for admins to post replies to daily work reports
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, report_id):
        # Check if user is admin
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Only admin users can post replies"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            # Get the report
            report = DailyWorkReport.objects.get(id=report_id)
            
            # Validate request data
            message = request.data.get('message', '').strip()
            if not message:
                return Response(
                    {"message": ["This field is required."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the reply
            reply = AdminReply.objects.create(
                report=report,
                admin=request.user,
                message=message
            )
            
            # Update the report's replied_at timestamp
            report.replied_at = timezone.now()
            report.replied_by = request.user
            report.save()
            
            # Log the action
            logger.info(f"Admin {request.user.id} replied to report {report_id}")
            
            # Return the created reply
            serializer = AdminReplySerializer(reply)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except DailyWorkReport.DoesNotExist:
            return Response(
                {"error": "Report not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error creating reply: {str(e)}")
            return Response(
                {"error": "An error occurred while creating the reply"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmployeeReportRepliesView(APIView):
    """
    API endpoint for employees to view replies to their reports
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id=None):
        try:
            # Get the employee for the current user
            employee = Employee.objects.get(user=request.user)
            
            # Get the report and verify ownership
            report = DailyWorkReport.objects.get(
                id=report_id,
                employee=employee
            )
            
            # Mark any unread replies as read
            report.replies.filter(is_read=False).update(is_read=True)
            
            # Get all replies for this report
            replies = report.replies.all().order_by('created_at')
            serializer = AdminReplySerializer(replies, many=True)
            
            # Prepare response data
            response_data = {
                'report_id': report.id,
                'date': report.date,
                'work_details': report.work_details,
                'replies': serializer.data
            }
            
            return Response(response_data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except DailyWorkReport.DoesNotExist:
            return Response(
                {"error": "Report not found or you don't have permission to view it"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching report replies: {str(e)}")
            return Response(
                {"error": "An error occurred while fetching report replies"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminDailyReportView(APIView):
    """
    View to see daily work reports with two tabs: Sent and Pending
    """
    permission_classes = []
    authentication_classes = []  # Disable all authentication
    
    def get(self, request):
        # Get today's date
        today = timezone.now().date()
        
        # Get all reports for today, ordered by creation time (newest first)
        reports = DailyWorkReport.objects.filter(date=today).order_by('-created_at')
        
        # Get pending and sent reports
        pending_reports = reports.filter(status='pending')
        sent_reports = reports.filter(status='sent')
        
        # Serialize the data
        pending_serializer = DailyWorkReportSerializer(
            pending_reports, 
            many=True,
            context={'request': request}
        )
        
        sent_serializer = DailyWorkReportSerializer(
            sent_reports,
            many=True,
            context={'request': request}
        )
        
        # Prepare response data
        response_data = {
            'pending': {
                'count': pending_reports.count(),
                'reports': pending_serializer.data
            },
            'sent': {
                'count': sent_reports.count(),
                'reports': sent_serializer.data
            }
        }
        
        return Response(response_data)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().select_related('user')
    serializer_class = EmployeeSerializer
    authentication_classes = []
    permission_classes = []  # No authentication required
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__first_name', 'user__last_name', 'email']
    ordering_fields = ['user__first_name', 'login_time', 'logout_time', 'hours_worked', 'status']
    
    def get_permissions(self):
        # Completely disable permission checks
        return []
        
    def get_authenticators(self):
        # Disable authentication
        return []

    @action(detail=False, methods=['get'])
    def today_attendance(self, request):
        """
        Get today's attendance for all employees
        Returns:
            List of employees with their login/logout times and hours worked today
        """
        try:
            today = timezone.now().date()
            today_logs = []
            
            # Get all employees
            employees = self.get_queryset()
            
            if not employees.exists():
                return Response({"detail": "No employees found"}, status=status.HTTP_404_NOT_FOUND)
            
            for employee in employees:
                # Initialize with default values
                login_time = None
                logout_time = None
                hours_worked = 0.0
                
                # Try to get login/logout times if they exist
                try:
                    # Get today's login
                    login = employee.attendance_logs.filter(
                        event_type='login',
                        timestamp__date=today
                    ).order_by('timestamp').first()
                    
                    # Get today's logout
                    logout = employee.attendance_logs.filter(
                        event_type='logout',
                        timestamp__date=today
                    ).order_by('timestamp').last()
                    
                    # Calculate hours worked if both login and logout exist
                    if login and logout:
                        time_diff = logout.timestamp - login.timestamp
                        hours_worked = round(time_diff.total_seconds() / 3600, 2)
                        login_time = login.timestamp
                        logout_time = logout.timestamp
                    elif login:
                        login_time = login.timestamp
                except Exception as e:
                    # Log the error but continue with other employees
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error processing employee {employee.id}: {str(e)}")
                
                today_logs.append({
                    'employee_id': employee.id,
                    'name': employee.user.get_full_name() if employee.user else 'No Name',
                    'email': employee.email,
                    'login_time': login_time,
                    'logout_time': logout_time,
                    'hours_worked': hours_worked,
                    'status': employee.status
                })
            
            return Response(today_logs)
            
        except Exception as e:
            return Response(
                {"detail": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        queryset = Employee.objects.all().select_related('user')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter.lower() != 'all':
            queryset = queryset.filter(status=status_filter.lower())
            
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            try:
                date = parse_date(date)
                if date:
                    queryset = queryset.filter(
                        Q(login_time__date=date) | 
                        Q(logout_time__date=date)
                    )
            except (ValueError, TypeError):
                pass
        
        # Calculate current hours for online employees
        current_time = timezone.now()
        for employee in queryset.filter(status='online', login_time__isnull=False):
            if employee.login_time:
                hours = (current_time - employee.login_time).total_seconds() / 3600
                employee.hours_worked = round(hours, 2)
                
        return queryset

    @action(detail=True, methods=['post', 'get'])
    def login(self, request, pk=None):
        employee = self.get_object()
        
        # Handle GET request - Admin can view login time
        if request.method == 'GET':
            if not (request.user.is_staff or request.user.is_superuser):
                return Response({
                    'success': False,
                    'error': 'You do not have permission to view this information'
                }, status=status.HTTP_403_FORBIDDEN)
                
            attendance_log = AttendancePunchInOut.objects.filter(
                employee=employee,
                event_type='punch_in'
            ).order_by('-timestamp').first()
            
            if not attendance_log:
                return Response({
                    'success': True,
                    'message': 'No login record found',
                    'data': {
                        'employee_id': employee.id,
                        'employee_name': employee.user.get_full_name() if employee.user else 'N/A',
                        'login_time': None,
                        'status': 'Not logged in today'
                    }
                })
                
            return Response({
                'success': True,
                'message': 'Login information retrieved',
                'data': {
                    'employee_id': employee.id,
                    'employee_name': employee.user.get_full_name() if employee.user else 'N/A',
                    'login_time': attendance_log.timestamp,
                    'status': employee.status,
                    'is_late': attendance_log.is_late,
                    'late_reason': attendance_log.late_reason if attendance_log.is_late else None
                }
            })
            
        # Handle POST request - Record login
        try:
            employee.login()
            serializer = self.get_serializer(employee)
            return Response({
                'success': True,
                'message': 'Login recorded successfully',
                'data': serializer.data
            })
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post', 'get'])
    def logout(self, request, pk=None):
        employee = self.get_object()
        
        # Handle GET request - Admin can view logout time
        if request.method == 'GET':
            if not (request.user.is_staff or request.user.is_superuser):
                return Response({
                    'success': False,
                    'error': 'You do not have permission to view this information'
                }, status=status.HTTP_403_FORBIDDEN)
                
            # Get the latest punch out record
            attendance_log = AttendancePunchInOut.objects.filter(
                employee=employee,
                event_type='punch_out'
            ).order_by('-timestamp').first()
            
            if not attendance_log:
                return Response({
                    'success': True,
                    'message': 'No logout record found',
                    'data': {
                        'employee_id': employee.id,
                        'employee_name': employee.user.get_full_name() if employee.user else 'N/A',
                        'logout_time': None,
                        'status': 'Not logged out today'
                    }
                })
                
            # Get corresponding punch in for hours worked
            punch_in = AttendancePunchInOut.objects.filter(
                employee=employee,
                event_type='punch_in',
                timestamp__date=attendance_log.timestamp.date(),
                timestamp__lte=attendance_log.timestamp
            ).order_by('-timestamp').first()
            
            hours_worked = None
            if punch_in:
                time_diff = attendance_log.timestamp - punch_in.timestamp
                hours_worked = round(time_diff.total_seconds() / 3600, 2)  # Convert to hours
            
            return Response({
                'success': True,
                'message': 'Logout information retrieved',
                'data': {
                    'employee_id': employee.id,
                    'employee_name': employee.user.get_full_name() if employee.user else 'N/A',
                    'logout_time': attendance_log.timestamp,
                    'hours_worked': hours_worked,
                    'status': employee.status
                }
            })
            
        # Handle POST request - Record logout
        try:
            employee.logout()
            serializer = self.get_serializer(employee)
            return Response({
                'success': True,
                'message': 'Logout recorded successfully',
                'data': serializer.data
            })
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        employee = self.get_object()
        new_status = request.data.get('status')
        
        try:
            employee.update_status(new_status)
            return Response({
                'success': True,
                'message': f'Status updated to {new_status}',
                'data': {
                    'status': employee.status,
                    'updated_at': employee.updated_at
                }
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of employee attendance"""
        today = timezone.now().date()
        
        # Get counts for today
        queryset = self.get_queryset()
        total_employees = queryset.count()
        online_count = queryset.filter(status='online').count()
        offline_count = queryset.filter(status='offline').count()
        on_leave_count = queryset.filter(status='leave').count()
        
        # Calculate average working hours for today
        today_employees = queryset.filter(
            login_time__date=today,
            logout_time__isnull=False
        )
        
        # Calculate total and average hours
        total_hours = sum(emp.hours_worked for emp in today_employees if emp.hours_worked)
        avg_hours = total_hours / len(today_employees) if today_employees else 0
        
        # Get late comers (logged in after 9:45 AM)
        late_time = timezone.make_aware(datetime.combine(today, time(9, 45)))
        
        late_comers = queryset.filter(
            login_time__date=today,
            login_time__gt=late_time
        ).count()
        
        return Response({
            'date': today,
            'total_employees': total_employees,
            'online': online_count,
            'offline': offline_count,
            'on_leave': on_leave_count,
            'average_hours_worked': round(avg_hours, 2),
            'late_comers': late_comers

        })


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

# class LogoutView(APIView):
#     permission_classes = (IsAuthenticated,)

#     def post(self, request):
#         try:
#             refresh_token = request.data.get("refresh")
#             token = RefreshToken(refresh_token)
#             token.blacklist()
#             return Response(status=status.HTTP_205_RESET_CONTENT)
#         except Exception as e:
#             return Response(status=status.HTTP_400_BAD_REQUEST)