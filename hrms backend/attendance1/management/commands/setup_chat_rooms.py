from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from attendance.models_chat import ChatRoom

User = get_user_model()

class Command(BaseCommand):
    help = 'Create chat rooms for all admin-employee pairs'

    def handle(self, *args, **options):
        # Get all admin users
        admins = User.objects.filter(is_staff=True)
        
        if not admins.exists():
            self.stdout.write(self.style.ERROR('No admin users found. Please create an admin user first.'))
            return
        
        # Get all non-admin users
        employees = User.objects.filter(is_staff=False, is_active=True)
        
        if not employees.exists():
            self.stdout.write(self.style.WARNING('No employee users found.'))
            return
        
        # Create chat rooms
        created_count = 0
        for admin in admins:
            for employee in employees:
                # Check if chat room already exists
                if not ChatRoom.objects.filter(admin=admin, employee=employee).exists():
                    ChatRoom.objects.create(admin=admin, employee=employee)
                    created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} chat rooms for {admins.count()} admins and {employees.count()} employees.')
        )
