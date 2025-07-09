from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    EmployeeViewSet, 
    DebugEmployees, 
    CustomTokenObtainPairView, 
    PasswordResetRequestView, 
    PasswordResetConfirmView,
    LateLoginReasonViewSet,
    ApproveLateLoginView,
    DailyWorkReportViewSet,
    PunchInView, PunchOutView, HRAttendanceView,
    LogoutView,
    AdminDailyReportView,
    AdminEmployeeReportView,
    EmployeeSearchView,
    AdminReplyToReportView,
    EmployeeReportRepliesView, 
    PunchInOutView,
    test_email
)

# Import new auth views
from .views_auth import (
    UserRegisterView,
    UserLoginView,
    AdminLoginView,
    UserProfileView,
    UserListView,
    EmployeeListView
)
from .views_chat import ChatRoomViewSet, UserStatusViewSet, websocket_urlpatterns

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'late-login-reasons', LateLoginReasonViewSet, basename='late-login-reason')
router.register(r'daily-work-reports', DailyWorkReportViewSet, basename='daily-work-report')

# Chat endpoints
router.register(r'chat/rooms', ChatRoomViewSet, basename='chat-room')
router.register(r'chat/status', UserStatusViewSet, basename='user-status')

# Define all URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Search endpoint with a unique path
    path('search-employees/', EmployeeSearchView.as_view(), name='employee-search'),
    
    # Authentication endpoints
    path('auth/register/', UserRegisterView.as_view(), name='auth_register'),
    path('auth/login/user/', UserLoginView.as_view(), name='user_login'),
    path('auth/login/admin/', AdminLoginView.as_view(), name='admin_login'),
    path('auth/me/', UserProfileView.as_view(), name='user_profile'),
    path('auth/users/', UserListView.as_view(), name='user_list'),
    path('auth/employees/', EmployeeListView.as_view(), name='employee_list'),
    
    # Token endpoints
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    
    # Late login approval (support both old and new URL patterns)
    path('late-login-reasons/<int:reason_id>/approve/', ApproveLateLoginView.as_view(), name='approve-late-login'),
    path('late-login/<int:reason_id>/approve/', ApproveLateLoginView.as_view(), name='approve-late-login-old'),
    
    # Debug endpoints
    path('debug/employees/', DebugEmployees.as_view(), name='debug-employees'),
    path('debug/test-email/', test_email, name='test-email'),
    
    # Employee endpoints
    path('employees/summary/', EmployeeViewSet.as_view({'get': 'summary'}), name='employee-summary'),
    path('employees/today/', EmployeeViewSet.as_view({'get': 'today_attendance'}), name='today-attendance'),
    path('employees/<int:pk>/login/', EmployeeViewSet.as_view({'post': 'login'}), name='employee-login'),
    path('employees/<int:pk>/logout/', EmployeeViewSet.as_view({'post': 'logout'}), name='employee-logout'),
    path('employees/<int:pk>/status/', EmployeeViewSet.as_view({'post': 'update_status'}), name='update-status'),
    
    # Chat endpoints
    path('chat/rooms/<int:pk>/messages/', ChatRoomViewSet.as_view({'get': 'messages'}), name='chat-messages'),
    path('chat/status/update/', UserStatusViewSet.as_view({'post': 'update_status'}), name='update-chat-status'),
    path('chat/', include(websocket_urlpatterns)),
    
    # Admin reports and replies
    path('admin/reports/employees/', AdminEmployeeReportView.as_view(), name='admin-employee-reports'),
    path('admin/reports/daily/', AdminDailyReportView.as_view(), name='admin-daily-reports'),
    path('admin/reports/<int:report_id>/reply/', AdminReplyToReportView.as_view(), name='admin-reply-to-report'),
    
    # Employee report replies
    path('employee/reports/<int:report_id>/replies/', EmployeeReportRepliesView.as_view(), name='employee-report-replies'),
    
    # Punch in/out
    path('attendance/punch-in/<int:employee_id>/', PunchInView.as_view(), name='punch-in'),
    path('attendance/punch-out/<int:employee_id>/', PunchOutView.as_view(), name='punch-out'),
    path('hr/attendance/', HRAttendanceView.as_view(), name='hr-attendance'),
    
    # WebSocket URLs
    *websocket_urlpatterns,
    
    # Password Reset URLs
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
