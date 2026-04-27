from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(response.data, dict):
            if "detail" in response.data:
                response.data = {
                    "error": {
                        "code": response.status_code,
                        "message": response.data["detail"],
                    }
                }
            else:
                response.data = {
                    "error": {
                        "code": response.status_code,
                        "message": "Validation failed.",
                        "fields": response.data,
                    }
                }
        return response

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

    return Response(
        {
            "error": {
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "Internal server error.",
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )