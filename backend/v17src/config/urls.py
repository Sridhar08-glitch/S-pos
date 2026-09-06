from django.conf import settings
from django.contrib import admin
from django.urls import include,path,re_path
from django.views.static import serve as media_serve
urlpatterns=[
 path("admin/",admin.site.urls),
 path("api/v1/",include("config.v1_urls")),
 path("api/",include("config.v1_urls")),
 path("health/",include("health.urls")),
 # uploaded files (logos, product photos) — in cloud deploys Nginx serves /media/ first
 re_path(r"^media/(?P<path>.*)$",media_serve,{"document_root":settings.MEDIA_ROOT}),
]
try:
 from drf_spectacular.views import SpectacularAPIView,SpectacularSwaggerView
 urlpatterns += [path("api/schema/",SpectacularAPIView.as_view(),name="schema"),path("api/docs/",SpectacularSwaggerView.as_view(url_name="schema"),name="swagger-ui")]
except ImportError: pass
