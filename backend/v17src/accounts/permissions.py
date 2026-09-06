from rest_framework.permissions import BasePermission

class RolePermission(BasePermission):
    allowed_roles=set()
    def has_permission(self,request,view):
        return bool(request.user and request.user.is_authenticated and
                    (request.user.is_superuser or not self.allowed_roles or request.user.role in self.allowed_roles))

class AdminOnly(RolePermission):
    allowed_roles={"ADMIN"}
class AdminManager(RolePermission):
    allowed_roles={"ADMIN","MANAGER"}
class SalesStaff(RolePermission):
    allowed_roles={"ADMIN","MANAGER","CASHIER"}
class InventoryStaff(RolePermission):
    allowed_roles={"ADMIN","MANAGER","INVENTORY"}
