from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Update passwords for all users to 1234'

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.all()
        
        updated_count = 0
        for user in users:
            user.set_password('1234')
            user.save()
            updated_count += 1
            user_type = "Admin" if user.is_superuser or user.is_staff else "User"
            self.stdout.write(self.style.SUCCESS(f'Updated password for {user_type}: {user.email}'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} users (including admin users)'))
