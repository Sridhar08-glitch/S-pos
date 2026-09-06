from rest_framework import serializers
from .models import User
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields=["id","username","first_name","last_name","email","phone","role","store","is_active"]
class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True,min_length=8)
    role=serializers.ChoiceField(choices=User.Role.choices,required=False,default=User.Role.CASHIER)
    class Meta:
        model=User
        fields=["username","password","first_name","last_name","email","phone","role","store"]
    def validate_role(self,value):
        # Only an ADMIN may mint another ADMIN; managers can create non-admin staff only.
        request=self.context.get("request")
        actor=getattr(request,"user",None)
        if value==User.Role.ADMIN and not (actor and (actor.is_superuser or actor.role==User.Role.ADMIN)):
            raise serializers.ValidationError("Only an administrator can create administrator accounts.")
        return value
    def create(self,validated_data):
        return User.objects.create_user(**validated_data)
