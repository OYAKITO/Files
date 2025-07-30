from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.index, name='index'),
    
    # TTS API endpoints - multiple options for reliability
    path('api/tts/', views.tts, name='tts_api'),                    # Primary TTS (tries all methods)
    path('api/tts/pyttsx3/', views.tts_pyttsx3, name='tts_pyttsx3'), # Offline TTS
    path('api/tts/edge/', views.tts_edge, name='tts_edge'),         # Microsoft Edge TTS
    path('api/tts/status/', views.tts_status, name='tts_status'),   # Check TTS availability
]