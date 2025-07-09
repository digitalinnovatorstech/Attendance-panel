from django.contrib import admin
from .models import Employee, AttendanceLog

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('user', 'email', 'status', 'login_time', 'logout_time', 
                   'hours_worked', 'last_activity')
    list_filter = ('status',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'email')
    readonly_fields = ('hours_worked', 'created_at', 'updated_at', 'last_activity')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(AttendanceLog)
class AttendanceLogAdmin(admin.ModelAdmin):
    list_display = ('employee', 'event_type', 'timestamp', 'hours_worked')
    list_filter = ('event_type',)
    search_fields = ('employee__user__username', 'employee__user__first_name', 'employee__user__last_name')
    readonly_fields = ('timestamp', 'hours_worked')
    date_hierarchy = 'timestamp'
