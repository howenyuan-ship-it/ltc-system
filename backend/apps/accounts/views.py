from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User, Organization
from .serializers import UserSerializer, UserCreateSerializer, OrganizationSerializer, MeSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'code']


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('organization').all()
    filterset_fields = ['role', 'organization', 'is_active']
    search_fields = ['username', 'chinese_name', 'employee_id', 'email']
    ordering_fields = ['chinese_name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        if request.method == 'GET':
            serializer = MeSerializer(request.user)
            return Response(serializer.data)
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
