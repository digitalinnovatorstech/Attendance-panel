from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Set default password (Pass@123) for all users'

    def handle(self, *args, **options):
        users = User.objects.all()
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in the database.'))
            return

        updated = 0
        for user in users:
            if not user.check_password('Pass@123'):
                user.set_password('Pass@123')
                user.save()
                updated += 1
                self.stdout.write(self.style.SUCCESS(f'Updated password for {user.email}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated} users with default password'))
