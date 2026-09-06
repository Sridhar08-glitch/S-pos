def scoped_store_id(request):
    return getattr(request.user,"store_id",None) if not getattr(request.user,"is_superuser",False) and getattr(request.user,"role","") not in {"ADMIN"} else None

def scope_store_queryset(request, qs, field="store"):
    store_id=scoped_store_id(request)
    if store_id:
        return qs.filter(**{field:store_id})
    return qs
