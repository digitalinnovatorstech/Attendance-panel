from rest_framework import serializers
from django.contrib.auth.models import User
from datetime import datetime, time
from django.utils import timezone
from .models import Employee, LateLoginReason, DailyWorkReport, AttendanceLog, AdminReply, AttendancePunchInOut
from django.utils import timezone

class EmployeeSearchSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for employee search results
    """
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email')
    status = serializers.CharField(source='get_status_display')
    report_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = ['id', 'name', 'email', 'status', 'report_status']
    
    def get_name(self, obj):
        return obj.user.get_full_name()
    
    def get_report_status(self, obj):
        today = timezone.now().date()
        try:
            report = DailyWorkReport.objects.get(
                employee=obj,
                date=today
            )
            return 'sent'
        except DailyWorkReport.DoesNotExist:
            return 'pending'


class LateLoginReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = LateLoginReason
        fields = ['id', 'employee', 'login_time', 'expected_time', 'reason', 'is_approved', 'approved_by', 'created_at', 'updated_at']
        read_only_fields = ['employee', 'login_time', 'created_at', 'updated_at', 'approved_by']


class AdminReplySerializer(serializers.ModelSerializer):
    admin_name = serializers.CharField(source='admin.get_full_name', read_only=True)
    
    class Meta:
        model = AdminReply
        fields = ['id', 'message', 'admin', 'admin_name', 'created_at', 'updated_at']
        read_only_fields = ['admin', 'created_at', 'updated_at']


class DailyWorkReportSerializer(serializers.ModelSerializer):
    employee_email = serializers.EmailField(source='employee.email', read_only=True)
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    replies = AdminReplySerializer(many=True, read_only=True)
    
    class Meta:
        model = DailyWorkReport
        fields = [
            'id', 'employee', 'employee_email', 'employee_name', 'date', 
            'work_details', 'status', 'admin_reply', 'replied_at', 'replied_by',
            'replies', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'employee', 'created_at', 'updated_at', 'replied_at', 
            'replied_by', 'replies'
        ]
        extra_kwargs = {
            'date': {'required': True},
            'work_details': {'required': True}
        }


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email')

class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(required=False)
    login_time = serializers.DateTimeField(read_only=True)
    logout_time = serializers.DateTimeField(read_only=True)
    hours_worked = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    status = serializers.ChoiceField(choices=Employee.STATUS_CHOICES, read_only=True)

    class Meta:
        model = Employee
        fields = ('id', 'user', 'user_id', 'full_name', 'email', 'login_time', 
                 'logout_time', 'hours_worked', 'status', 'created_at', 'updated_at')
        read_only_fields = ('hours_worked', 'created_at', 'updated_at', 'status')

    def get_full_name(self, obj):
        return obj.user.get_full_name()
        
    def validate_email(self, value):
        if self.instance and self.instance.email != value:
            if Employee.objects.filter(email=value).exists():
                raise serializers.ValidationError("Email already exists.")
        return value.lower()




class EmployeeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Employee.STATUS_CHOICES)
    
    def validate_status(self, value):
        employee = self.context['employee']
        if value == 'online' and employee.status == 'online':
            raise serializers.ValidationError("Employee is already online.")
        if value == 'leave' and employee.status == 'leave':
            raise serializers.ValidationError("Employee is already on leave.")
        if value == 'offline' and employee.status != 'online':
            raise serializers.ValidationError("Cannot set to offline when not online.")
        return value


class EmployeeWithReportSerializer(serializers.ModelSerializer):
    """
    Serializer for employee data including daily report status
    """
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email')
    login_time = serializers.SerializerMethodField()
    logout_time = serializers.SerializerMethodField()
    hours_worked = serializers.SerializerMethodField()
    status = serializers.CharField(source='get_status_display')
    daily_report = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = ['id', 'name', 'email', 'login_time', 'logout_time', 
                 'hours_worked', 'status', 'daily_report']
    
    def get_name(self, obj):
        return obj.user.get_full_name()
    
    def get_login_time(self, obj):
        if obj.login_time:
            return obj.login_time.strftime('%H:%M:%S')
        return None
    
    def get_logout_time(self, obj):
        if obj.logout_time:
            return obj.logout_time.strftime('%H:%M:%S')
        return None
    
    def get_hours_worked(self, obj):
        if obj.hours_worked:
            return f"{float(obj.hours_worked):.2f} hrs"
        return "0.00 hrs"
    
    def get_daily_report(self, obj):
        today = timezone.now().date()
        try:
            report = DailyWorkReport.objects.get(
                employee=obj,
                date=today
            )
            return {
                'status': report.status,
                'submitted_at': report.created_at.strftime('%H:%M:%S'),
                'details': report.work_details[:50] + '...' if report.work_details else ''
            }
        except DailyWorkReport.DoesNotExist:
            return {
                'status': 'pending',
                'submitted_at': None,
                'details': None
            }


class AttendancePunchInOutSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    date = serializers.SerializerMethodField()
    punch_in = serializers.SerializerMethodField()
    punch_out = serializers.SerializerMethodField()
    hours = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendancePunchInOut
        fields = ['id', 'employee_name', 'date', 'punch_in', 'punch_out', 'hours', 'status', 'reason']
        read_only_fields = ['employee', 'total_hours', 'is_approved']
    
    def get_date(self, obj):
        return obj.date.strftime('%d/%m/%Y')
    
    def get_punch_in(self, obj):
        return obj.punch_in.strftime('%I:%M %p') if obj.punch_in else '-'
    
    def get_punch_out(self, obj):
        return obj.punch_out.strftime('%I:%M %p') if obj.punch_out else '-'
    
    def get_hours(self, obj):
        if obj.punch_in and obj.punch_out:
            time_diff = obj.punch_out - obj.punch_in
            total_seconds = int(time_diff.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return '00:00:00'


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data


class AttendanceLogSerializer(serializers.ModelSerializer):
    """Serializer for attendance log entries"""
    
    class Meta:
        model = AttendanceLog
        fields = [
            'id', 'employee', 'event_type', 'timestamp', 
            'punch_out', 'hours_worked', 'is_late', 'late_reason'
        ]
        read_only_fields = [
            'id', 'employee', 'timestamp', 'punch_out', 
            'hours_worked', 'is_late'
        ]
    
    def validate(self, data):
        """
        Validate the attendance log data.
        """
        request = self.context.get('request')
        if request and request.method == 'POST':
            # For punch in, check if already punched in today
            if data.get('event_type') == 'punch_in':
                today = timezone.now().date()
                existing_punch = AttendanceLog.objects.filter(
                    employee=request.user.employee,
                    event_type='punch_in',
                    timestamp__date=today,
                    punch_out__isnull=True
                ).exists()
                
                if existing_punch:
                    raise serializers.ValidationError("You have already punched in today.")
                
                # Check if late and reason is provided
                punch_in_time = timezone.now().time()
                late_threshold = time(9, 30)  # 9:30 AM
                if punch_in_time > late_threshold and not data.get('late_reason'):
                    raise serializers.ValidationError(
                        {'late_reason': 'Reason is required for late punch-in (after 9:30 AM)'}
                    )
            
            # For punch out, check if there's an open punch in
            elif data.get('event_type') == 'punch_out':
                has_open_punch = AttendanceLog.objects.filter(
                    employee=request.user.employee,
                    event_type='punch_in',
                    punch_out__isnull=True
                ).exists()
                
                if not has_open_punch:
                    raise serializers.ValidationError("No open punch-in found to punch out from.")
        
        return data
    
    def create(self, validated_data):
        """Create a new attendance log entry."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'employee'):
            validated_data['employee'] = request.user.employee
        
        return super().create(validated_data)