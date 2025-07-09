from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class ChatRoom(models.Model):
    """Represents a chat room between users"""
    ROOM_TYPES = (
        ('direct', 'Direct Message'),
        ('group', 'Group Chat')
    )
    
    name = models.CharField(max_length=255, blank=True, null=True)
    participants = models.ManyToManyField(
        User,
        related_name='chat_rooms',
        blank=True
    )
    room_type = models.CharField(max_length=10, choices=ROOM_TYPES, default='direct')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_rooms',
        help_text='User who created the chat room'
    )
    admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='administered_rooms',
        help_text='Administrator of the group chat (optional)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        if self.name:
            return self.name
        if self.room_type == 'direct' and self.participants.count() == 2:
            users = list(self.participants.all())
            return f"Chat: {users[0].get_full_name()} and {users[1].get_full_name()}"
        return f"Chat Room {self.id}"

class Message(models.Model):
    """Represents a message in a chat room"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        help_text='User who sent the message'
    )
    content = models.TextField(blank=True, null=True, help_text='Text content of the message')
    attachment = models.FileField(
        upload_to='chat_attachments/%Y/%m/%d/',
        null=True,
        blank=True,
        help_text='Optional file attachment'
    )
    file_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='MIME type of the attachment'
    )
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    is_edited = models.BooleanField(default=False, help_text='Whether the message has been edited')
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['room', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.sender.email}: {self.content[:50] if self.content else '[File]'}"


class MessageReadReceipt(models.Model):
    """Tracks which users have read which messages"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reads')
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('message', 'user')
        ordering = ['-read_at']
    
    def __str__(self):
        return f"{self.user.email} read message {self.message.id}"


class UserMention(models.Model):
    """Tracks @mentions in messages"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='mentions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mentions')
    start_index = models.IntegerField(help_text='Start index of the mention in the message')
    end_index = models.IntegerField(help_text='End index of the mention in the message')
    
    class Meta:
        ordering = ['message', 'start_index']
    
    def __str__(self):
        return f"@{self.user.username} in message {self.message.id}"

class UserStatus(models.Model):
    """Tracks user online status and last seen"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='chat_status')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - {'Online' if self.is_online else 'Offline'}"
