"""
Custom API exception handler.

Formats validation, database, and server errors into a consistent JSON response.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    # Let DRF handle known exceptions first
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(response.data, dict):
            # Standard DRF "detail" error
            if "detail" in response.data:
                response.data = {
                    "error": {
                        "code": response.status_code,
                        "message": response.data["detail"],
                    }
                }
            else:
                # Field-level validation errors
                response.data = {
                    "error": {
                        "code": response.status_code,
                        "message": "Validation failed.",
                        "fields": response.data,
                    }
                }
        return response

    # Handle Django validation errors (model-level)
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            return Response(
                {
                    "error": {
                        "code": status.HTTP_400_BAD_REQUEST,
                        "message": "Validation failed.",
                        "fields": exc.message_dict,
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "error": {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "message": exc.messages,
                }
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Handle database conflicts (e.g., duplicate keys)
    if isinstance(exc, IntegrityError):
        return Response(
            {
                "error": {
                    "code": status.HTTP_409_CONFLICT,
                    "message": "Request conflicts with existing data.",
                }
            },
            status=status.HTTP_409_CONFLICT,
        )

    # Fallback for unexpected server errors
    return Response(
        {
            "error": {
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "Internal server error.",
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
