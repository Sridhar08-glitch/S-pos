from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import TimeEntry


class TimeEntrySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    minutes = serializers.IntegerField(read_only=True)
    class Meta:
        model = TimeEntry
        fields = ["id", "user", "username", "store", "clock_in", "clock_out", "note", "minutes"]
        read_only_fields = ["user", "clock_in", "clock_out", "minutes"]


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    filterset_fields = ["user", "store"]

    def get_queryset(self):
        qs = TimeEntry.objects.select_related("user", "store").all()
        if getattr(self.request.user, "role", "") not in ("ADMIN", "MANAGER"):
            qs = qs.filter(user=self.request.user)   # staff see only their own entries
        return qs.order_by("-clock_in")

    @action(detail=False, methods=["get"])
    def current(self, request):
        e = TimeEntry.objects.filter(user=request.user, clock_out__isnull=True).order_by("-clock_in").first()
        return Response(self.get_serializer(e).data if e else {})

    @action(detail=False, methods=["post"], url_path="clock-in")
    def clock_in(self, request):
        if TimeEntry.objects.filter(user=request.user, clock_out__isnull=True).exists():
            return Response({"detail": "You are already clocked in."}, status=400)
        e = TimeEntry.objects.create(user=request.user, store_id=getattr(request.user, "store_id", None), note=request.data.get("note", ""))
        return Response(self.get_serializer(e).data, status=201)

    @action(detail=False, methods=["post"], url_path="clock-out")
    def clock_out(self, request):
        e = TimeEntry.objects.filter(user=request.user, clock_out__isnull=True).order_by("-clock_in").first()
        if not e:
            return Response({"detail": "You are not clocked in."}, status=400)
        e.clock_out = timezone.now(); e.save(update_fields=["clock_out"])
        return Response(self.get_serializer(e).data)
