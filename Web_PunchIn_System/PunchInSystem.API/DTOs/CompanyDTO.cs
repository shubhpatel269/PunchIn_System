namespace PunchInSystem.API.DTOs;


public class CompanyDto
{
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactNo { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyType { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyCity { get; set; }
    public string? CompanyState { get; set; }
    public DateTime CompanyCreatedAt { get; set; }
    public int? CompanyCreatedBySuperadminId { get; set; }
    public bool CompanyIsDeleted { get; set; }
    public DateTime? CompanyDeletedAt { get; set; }
    public int? CompanyDeletedBySuperadminId { get; set; }
}

public class CreateCompanyDto
{
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactNo { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyType { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyCity { get; set; }
    public string? CompanyState { get; set; }

}

public class UpdateCompanyDto
{
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactNo { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyType { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyCity { get; set; }
    public string? CompanyState { get; set; }
}
