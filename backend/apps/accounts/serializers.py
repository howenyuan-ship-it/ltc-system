from rest_framework import serializers
from .models import User, Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'code', 'address', 'phone', 'is_active']


class UserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'chinese_name', 'email', 'role', 'role_display',
            'organization', 'organization_name', 'employee_id', 'phone',
            'avatar', 'is_active', 'created_at'
        ]
        read_only_fields = ['created_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'chinese_name', 'email', 'role',
            'organization', 'employee_id', 'phone'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class MeSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'chinese_name', 'email', 'role', 'role_display',
            'organization', 'employee_id', 'phone', 'avatar'
        ]
