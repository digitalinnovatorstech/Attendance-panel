from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from attendance.models import Employee
import pandas as pd

class Command(BaseCommand):
    help = 'Add multiple employees from Excel file'

    def add_arguments(self, parser):
        parser.add_argument('excel_file', type=str, help='Path to the Excel file containing employee data')

    def handle(self, *args, **options):
        try:
            # Read Excel file
            excel_file = options['excel_file']
            df = pd.read_excel(excel_file, skiprows=1)  # Skip the header row

            for index, row in df.iterrows():
                # Get name and email from columns
                full_name = str(row['Name']).strip()
                email = str(row['Email Ids']).strip().lower()

                # Create username from email (remove @innovatorstech.com)
                username = email.split('@')[0]

                # Split full name into first and last name
                name_parts = full_name.split(maxsplit=1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ''

                employee_data = {
                    'username': username,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'password': 'employee123'  # Default password
                }

                try:
                    # Check if user already exists
                    if User.objects.filter(username=username).exists():
                        self.stdout.write(
                            self.style.WARNING(
                                f'Employee already exists: {full_name} ({email})'
                            )
                        )
                        continue

                    # Create User
                    user = User.objects.create_user(
                        username=employee_data['username'],
                        email=employee_data['email'],
                        password=employee_data['password'],
                        first_name=employee_data['first_name'],
                        last_name=employee_data['last_name']
                    )

                    # Create Employee
                    Employee.objects.create(
                        user=user,
                        email=employee_data['email']
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully created employee: {full_name} ({email})'
                        )
                    )

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Failed to create employee {full_name} ({email}): {str(e)}'
                        )
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to process Excel file: {str(e)}'
                )
            )