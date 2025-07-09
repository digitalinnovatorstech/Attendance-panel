from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        
        # Check if we're using email for authentication
        email = kwargs.get('email', username)
        
        if email is None or password is None:
            return None
            
        try:
            # Try to find user by email or username
            user = UserModel._default_manager.get(
                Q(email__iexact=email) | 
                Q(username__iexact=email) |
                Q(username__iexact=username)
            )
            
            # Verify the password
            if user.check_password(password):
                return user
                
        except UserModel.DoesNotExist:
            # No user found with this email/username
            UserModel().set_password(password)
            return None
            
        except UserModel.MultipleObjectsReturned:
            # Multiple users found - this shouldn't happen with unique email/username
            return None
            
        return None
    
    def get_user(self, user_id):
        UserModel = get_user_model()
        try:
            user = UserModel._default_manager.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None
        return user if self.user_can_authenticate(user) else None
