from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework.schemas import get_schema_view
from rest_framework.documentation import include_docs_urls
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView
)

from attendance.consumers import ChatConsumer

schema_view = get_schema_view(
    title='HRMS API',
    description='API for Employee Attendance Management System',
    version='1.0.0',
    public=True,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API - All API endpoints under /api/
    path('api/', include([
        # Include all attendance app URLs under /api/
        path('', include('attendance.urls')),
        
        # JWT Authentication (kept for backward compatibility)
        path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
        path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
        
        # API Auth
        path('auth/', include('rest_framework.urls')),
        
        # API schema and documentation
        path('openapi/', schema_view, name='openapi-schema'),
        path('docs/', include_docs_urls(title='HRMS API')),
    ])),
    
    # WebSocket URL for Channels
    re_path(r'^ws/chat/(?P<room_name>\w+)/$', ChatConsumer.as_asgi()),
]
