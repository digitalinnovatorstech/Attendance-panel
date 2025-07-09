from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from django.db import connection

class Command(BaseCommand):
    help = 'Set up the chat application'

    def handle(self, *args, **options):
        self.stdout.write('Setting up chat application...')
        
        # Create database tables
        try:
            with connection.schema_editor() as schema_editor:
                from django.db import models
                from attendance.models_chat import ChatRoom, Message, UserStatus
                
                # Create tables if they don't exist
                for model in [ChatRoom, Message, UserStatus]:
                    schema_editor.create_model(model)
                    self.stdout.write(self.style.SUCCESS(f'Created table for {model.__name__}'))
                    
        except ProgrammingError as e:
            self.stdout.write(self.style.WARNING(f'Error creating tables: {e}'))
            self.stdout.write('Tables might already exist. Continuing...')
        
        # Create chat rooms for existing users
        self.stdout.write('Creating chat rooms...')
        from django.core.management import call_command
        call_command('setup_chat_rooms')
        
        self.stdout.write(self.style.SUCCESS('Chat setup completed successfully!'))
