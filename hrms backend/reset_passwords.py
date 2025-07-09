import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrms_backend.settings')
django.setup()

def reset_passwords():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Update password for all users
    for user in User.objects.all():
        user.set_password('12345')
        user.is_active = True  # Ensure user is active
        user.save()
        print(f"Updated password for {user.email}")
    
    # Verify the changes
    print("\nUpdated users:")
    for user in User.objects.all():
        print(f"Email: {user.email}, Active: {user.is_active}")

if __name__ == "__main__":
    reset_passwords()
