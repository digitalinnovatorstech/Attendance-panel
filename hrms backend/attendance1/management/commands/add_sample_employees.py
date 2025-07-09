from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from attendance.models import Employee
from faker import Faker
import random

class Command(BaseCommand):
    help = 'Add 97 sample employees to the database'

    def handle(self, *args, **options):
        fake = Faker('en_IN')  # Indian names and data
        
        # Create 97 employees
        for i in range(1, 98):
            try:
                # Create user
                username = f'emp{i:03d}'
                first_name = fake.first_name()
                last_name = fake.last_name()
                email = f'{username}@hrms.com'
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password='password@123',
                    first_name=first_name,
                    last_name=last_name
                )
                
                # Create employee profile
                status = random.choices(
                    ['online', 'offline', 'leave'],
                    weights=[30, 60, 10],  # 30% online, 60% offline, 10% on leave
                    k=1
                )[0]
                
                Employee.objects.create(
                    user=user,
                    email=email,
                    status=status,
                    report_status='pending'
                )
                
                self.stdout.write(self.style.SUCCESS(f'Created employee: {first_name} {last_name} ({username})'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating employee {i}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully created 97 sample employees'))
