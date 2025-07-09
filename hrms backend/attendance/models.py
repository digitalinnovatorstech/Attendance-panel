from django.db import models
from django.contrib.auth.models import User, Group
from django.utils import timezone
from datetime import datetime, time, timedelta
from django.core.exceptions import ValidationError
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
import pytz

class Employee(models.Model):
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('leave', 'Leave')
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    email = models.EmailField(unique=True)
    login_time = models.DateTimeField(null=True, blank=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='offline')
    last_activity = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['user__first_name', 'user__last_name']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.email}"

    def is_within_office_hours(self, dt=None):
        """Check if the given datetime is within office hours (9:30 AM to 6:40 PM)"""
        if dt is None:
            dt = timezone.now()
        office_start = time(9, 30)  # 9:30 AM
        office_end = time(18, 40)   # 6:40 PM
        current_time = dt.time()
        return office_start <= current_time <= office_end

    def login(self):
        now = timezone.now()
        today = now.date()
        
        # Check if already logged in today
        if self.login_time and self.login_time.date() == today and self.status == 'online':
            raise ValidationError('Already logged in today')
            
        # Check office hours (only during weekdays)
        if now.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            raise ValidationError('Cannot login on weekends')
            
        if not self.is_within_office_hours(now):
            raise ValidationError('Cannot login outside office hours (9:30 AM - 6:40 PM)')
            
        # Reset logout time if it's from a previous day
        if self.logout_time and self.logout_time.date() < today:
            self.logout_time = None
            
        self.login_time = now
        self.status = 'online'
        self.save()
        
        # Log the login event
        AttendanceLog.objects.create(
            employee=self,
            event_type='login',
            timestamp=now
        )
        
    def logout(self):
        now = timezone.now()
        
        if not self.login_time or self.status != 'online':
            raise ValidationError('Cannot logout without being logged in')
            
        # Ensure logout is after login
        if now < self.login_time:
            raise ValidationError('Logout time cannot be before login time')
            
        self.logout_time = now
        self.status = 'offline'
        self.calculate_hours_worked()
        self.save()
        
        # Log the logout event
        AttendanceLog.objects.create(
            employee=self,
            event_type='logout',
            timestamp=now
        )
        
    def calculate_hours_worked(self):
        if self.login_time and self.logout_time:
            # Convert login/logout to local time
            login = timezone.localtime(self.login_time)
            logout = timezone.localtime(self.logout_time)
            
            # Define office hours
            office_start = time(9, 30)  # 9:30 AM
            office_end = time(18, 40)   # 6:40 PM
            
            # Create datetime objects for comparison
            login_date = login.date()
            login_dt = datetime.combine(login_date, office_start)
            logout_dt = datetime.combine(login_date, office_end)
            
            # Adjust login/logout times to be within office hours
            login_time = max(login, login_dt)
            logout_time = min(logout, logout_dt)
            
            # Calculate working hours
            if logout_time > login_time:
                time_difference = logout_time - login_time
                total_hours = time_difference.total_seconds() / 3600
                self.hours_worked = min(round(total_hours, 2), 9.17)  # 9 hours 10 minutes = 9.17 hours
            else:
                self.hours_worked = 0
        
    def update_status(self, new_status):
        """Update employee status with validation"""
        if new_status not in dict(self.STATUS_CHOICES).keys():
            raise ValidationError(f'Invalid status: {new_status}')
            
        if new_status == 'online' and not self.login_time:
            raise ValidationError('Cannot set status to online without login time')
            
        self.status = new_status
        self.save()
        
    def get_attendance_for_date(self, date):
        """Get attendance record for a specific date"""
        return {
            'date': date,
            'login_time': self.login_time if self.login_time and self.login_time.date() == date.date() else None,
            'logout_time': self.logout_time if self.logout_time and self.logout_time.date() == date.date() else None,
            'hours_worked': self.hours_worked if (self.login_time and self.login_time.date() == date.date()) else 0,
            'status': self.status
        }
        
    def get_weekly_summary(self, start_date=None):
        """Get weekly attendance summary"""
        if start_date is None:
            start_date = timezone.now().date() - timedelta(days=timezone.now().weekday())
            
        end_date = start_date + timedelta(days=6)
        
        # Get all attendance logs for the week
        logs = self.attendance_logs.filter(
            timestamp__date__range=[start_date, end_date]
        ).order_by('timestamp')
        
        return {
            'start_date': start_date,
            'end_date': end_date,
            'total_hours': sum(log.hours_worked for log in logs if log.hours_worked),
            'days_worked': len(set(log.timestamp.date() for log in logs if log.event_type == 'login')),
            'logs': logs
        }


class LateLoginReason(models.Model):
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='late_login_reasons')
    login_time = models.DateTimeField()
    expected_time = models.TimeField(null=True, blank=True, help_text="Expected time of arrival (HH:MM:SS)")
    reason = models.TextField()
    is_approved = models.BooleanField(null=True, blank=True)  # null = pending, True = approved, False = rejected
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_reasons')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee} - {self.login_time.date()} - {'Approved' if self.is_approved else 'Rejected' if self.is_approved is False else 'Pending'}"


class DailyWorkReport(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='daily_reports')
    date = models.DateField()
    work_details = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    admin_reply = models.TextField(blank=True, null=True)
    replied_at = models.DateTimeField(blank=True, null=True)
    replied_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='replied_reports')

    class Meta:
        unique_together = ('employee', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.date}"


class PasswordResetToken(models.Model):
    """Model to store password reset tokens"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        self.is_used = True
        self.save()


class AttendancePunchInOut(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='punch_records')
    date = models.DateField()
    punch_in = models.DateTimeField(null=True, blank=True)
    punch_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='Pending')
    reason = models.TextField(blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    hour = models.CharField(max_length=8, blank=True, null=True, help_text="Total hours worked in HH:MM:SS format")

    def save(self, *args, **kwargs):
        # Calculate hours worked when punching out
        if self.punch_in and self.punch_out:
            duration = self.punch_out - self.punch_in
            total_seconds = int(duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            self.hour = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.date}"

    class Meta:
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"
        ordering = ['-date', '-punch_in']


class AdminReply(models.Model):
    """
    Model to store admin replies to daily work reports
    """
    report = models.ForeignKey(DailyWorkReport, on_delete=models.CASCADE, related_name='replies')
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='replies_given')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Admin Replies'

    def __str__(self):
        return f"Reply to {self.report} by {self.admin.get_full_name()}"


class AttendanceLog(models.Model):
    """
    Model to track all attendance events including punch in/out
    """
    EVENT_TYPES = [
        ('punch_in', 'Punch In'),
        ('punch_out', 'Punch Out'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('status_change', 'Status Change')
    ]
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='attendance_logs'
    )
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    punch_out = models.DateTimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_late = models.BooleanField(default=False)
    late_reason = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    reason = models.TextField(blank=True, null=True, help_text='Reason for late punch-out or other attendance notes')

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Attendance Log'
        verbose_name_plural = 'Attendance Logs'

    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.get_event_type_display()} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        # Check for late punch in (after 9:30 AM)
        if self.event_type == 'punch_in':
            punch_in_time = self.timestamp.time()
            late_threshold = time(9, 30)  # 9:30 AM
            self.is_late = punch_in_time > late_threshold
            
            # If late and no reason provided, raise validation error
            if self.is_late and not self.late_reason:
                raise ValidationError('Reason is required for late punch-in')
        
        # If this is a punch out, update the punch in record
        if self.event_type == 'punch_out':
            # Find the most recent punch in without a punch out
            last_punch_in = AttendanceLog.objects.filter(
                employee=self.employee,
                event_type='punch_in',
                punch_out__isnull=True
            ).order_by('-timestamp').first()
            
            if last_punch_in:
                # Calculate hours worked
                time_diff = self.timestamp - last_punch_in.timestamp
                hours_worked = round(time_diff.total_seconds() / 3600, 2)
                
                # Update the punch in record with punch out time and hours worked
                last_punch_in.punch_out = self.timestamp
                last_punch_in.hours_worked = hours_worked
                last_punch_in.save(update_fields=['punch_out', 'hours_worked'])
                
                # Update employee status
                self.employee.status = 'offline'
                self.employee.save(update_fields=['status'])
        
        super().save(*args, **kwargs)

@receiver(pre_save, sender=Employee)
def update_employee_status(sender, instance, **kwargs):
    # Prevent infinite recursion
    if hasattr(instance, '_already_updating'):
        return
        
    # Set flag to prevent recursion
    instance._already_updating = True
    
    try:
        # Update status based on login/logout times
        now = timezone.now()
        if instance.login_time and instance.login_time.date() == now.date() and not instance.logout_time:
            instance.status = 'online'
        elif instance.logout_time and instance.logout_time.date() == now.date():
            instance.status = 'offline'
        else:
            instance.status = 'leave'
    finally:
        # Always remove the flag, even if an exception occurs
        delattr(instance, '_already_updating')
