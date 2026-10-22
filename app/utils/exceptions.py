"""
Custom Application Exceptions.

Defines domain-specific exceptions for IT Asset & Ticket Management.
"""

class ITAssetBaseException(Exception):
    """Base exception for all domain errors in this application."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidAssetError(ITAssetBaseException):
    """Raised when an asset operation or attribute is invalid."""
    pass


class InvalidTicketError(ITAssetBaseException):
    """Raised when ticket data or attributes fail validation."""
    pass


class InvalidStatusTransitionError(ITAssetBaseException):
    """Raised when attempting an unauthorized or invalid status change."""
    pass


class SLAConfigurationError(ITAssetBaseException):
    """Raised when SLA parameters or deadlines cannot be calculated."""
    pass


class FileProcessingError(ITAssetBaseException):
    """Raised when text file parsing or ingestion fails."""
    pass


class DatabaseConnectionError(ITAssetBaseException):
    """Raised when the database connection or query fails."""
    pass
