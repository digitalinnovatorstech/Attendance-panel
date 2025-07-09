from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time, datetime, timedelta
from django.db.models import Q
from attendance.models import Employee

class Command(BaseCommand):
    help = 'Reset daily attendance records for all employees'

    def handle(self, *args, **options):
        # Get current time in the timezone
        now = timezone.now()
        
        # Find employees who are still marked as online
        online_employees = Employee.objects.filter(status='online')
        
        # Force logout any employees still marked as online
        for employee in online_employees:
            self.stdout.write(f'Forcing logout for {employee.user.get_full_name()}...')
            try:
                employee.logout()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully logged out {employee.user.get_full_name()}. '
                        f'Worked {employee.hours_worked} hours.'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error logging out {employee.user.get_full_name()}: {str(e)}'
                    )
                )
        
        # Reset report status for all employees
        updated = Employee.objects.update(
            daily_report='',
            report_status='pending'
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully reset daily attendance. Updated {updated} employees.'
            )
        )
