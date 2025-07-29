from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/tts/', views.tts, name='tts_api'),
]

