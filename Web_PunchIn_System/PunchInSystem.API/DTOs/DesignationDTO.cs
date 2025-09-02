namespace PunchInSystem.API.DTOs;

public class DesignationDto
{
    public int DesignationId { get; set; }
    public int CompanyId { get; set; }
    public string DesignationName { get; set; } = string.Empty;
    public string? DesignationDescription { get; set; }
    public DateTime DesignationCreatedAt { get; set; }
    public bool DesignationIsDeleted { get; set; }
    public DateTime? DesignationDeletedAt { get; set; }
    public int? DesignationDeletedById { get; set; }

    public int? DesignationDeletedBySuperadminId { get; set; }
}

public class CreateDesignationDto
{
    public int CompanyId { get; set; }
    public string DesignationName { get; set; } = string.Empty;
    public string? DesignationDescription { get; set; }
}

public class UpdateDesignationDto
{
    public string DesignationName { get; set; } = string.Empty;
    public string? DesignationDescription { get; set; }
}
