import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrms_backend.settings')  # Updated to correct settings module path
django.setup()

from django.contrib.auth import get_user_model

def update_admin_password():
    User = get_user_model()
    email = 'venkateswararao.garikapati@innovatorstech.com'
    new_password = 'Pass@11'

    users = User.objects.filter(email=email)

    if users.exists():
        # Update all users with this email
        for user in users:
            user.set_password(new_password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.save()
            print(f"Updated password for user: {user.username} ({user.email})")
        
        print(f"\n✅ Successfully updated {users.count()} user(s).")
        
        if users.count() > 1:
            print("\n⚠️  Warning: Multiple users found with the same email.")
            print("   Consider keeping only one active admin user and removing duplicates.")
    else:
        # Create new user if none exists
        user = User.objects.create_superuser(
            username=email.split('@')[0],
            email=email,
            password=new_password,
            first_name='Venkateswara',
            last_name='Garikapati'
        )
        print(f"\n✅ Created new admin user: {user.email}")

if __name__ == "__main__":
    update_admin_password()
