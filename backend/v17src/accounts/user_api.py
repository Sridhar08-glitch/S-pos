from rest_framework import serializers, viewsets
from .models import User
from .permissions import AdminOnly

class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    class Meta:
        model = User
        fields = ["id","username","password","first_name","last_name","email","phone","role","store","is_active","is_staff","is_superuser"]
        read_only_fields = ["id","is_staff","is_superuser"]
    def create(self, validated_data):
        password=validated_data.pop("password",None)
        user=User(**validated_data)
        if password: user.set_password(password)
        else: user.set_unusable_password()
        user.save(); return user
    def update(self,instance,validated_data):
        password=validated_data.pop("password",None)
        for k,v in validated_data.items(): setattr(instance,k,v)
        if password: instance.set_password(password)
        instance.save(); return instance

class UserAdminViewSet(viewsets.ModelViewSet):
    queryset=User.objects.select_related("store").all().order_by("username")
    serializer_class=UserAdminSerializer
    permission_classes=[AdminOnly]
    search_fields=["username","first_name","last_name","email","phone"]
    filterset_fields=["role","store","is_active"]

    def destroy(self, request, *args, **kwargs):
        obj=self.get_object()
        if obj==request.user:
            from rest_framework.response import Response
            return Response({"detail":"You cannot deactivate your own account."},status=400)
        obj.is_active=False
        obj.save(update_fields=["is_active"])
        from rest_framework.response import Response
        return Response(status=204)
