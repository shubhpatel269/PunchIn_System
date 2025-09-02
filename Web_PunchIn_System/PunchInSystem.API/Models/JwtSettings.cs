namespace PunchInSystem.API.Models;

public class JwtSettings
{
    public string Secret { get; set; } = null!;
    public int TokenExpirationInMinutes { get; set; }
    public string Issuer { get; set; } = "PunchInSystem.API";
    public string Audience { get; set; } = "PunchInSystem.Clients";
}
