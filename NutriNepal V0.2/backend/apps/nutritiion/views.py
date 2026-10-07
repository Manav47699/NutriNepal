from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Prefetch
from django.http import Http404

from .models import FoodItem, FoodAlias
from .serializers import FoodItemSerializer


class FoodItemListView(generics.ListAPIView):
    """
    API view to retrieve a list of all active food items, along with their active aliases.
    Supports authenticated search by food name and active aliases.
    """

    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter only active FoodItems and prefetch only active FoodAliases to avoid N+1 query issue
        queryset = FoodItem.objects.filter(is_active=True).prefetch_related(
            Prefetch("food_aliases", queryset=FoodAlias.objects.filter(is_active=True))
        )

        # Support search by name or alias
        search_query = self.request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query)
                | Q(
                    food_aliases__alias__icontains=search_query,
                    food_aliases__is_active=True,
                )
            ).distinct()

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "status": True,
                "message": "Food items fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class FoodItemDetailView(generics.RetrieveAPIView):
    """
    API view to retrieve a single active food item with its active aliases.
    Returns 404 if the item is inactive or nonexistent.
    """

    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Retrieve only active FoodItems and prefetch active FoodAliases
        return FoodItem.objects.filter(is_active=True).prefetch_related(
            Prefetch("food_aliases", queryset=FoodAlias.objects.filter(is_active=True))
        )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Http404:
            return Response(
                {
                    "status": False,
                    "message": "Food item not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(instance)
        return Response(
            {
                "status": True,
                "message": "Food item fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
