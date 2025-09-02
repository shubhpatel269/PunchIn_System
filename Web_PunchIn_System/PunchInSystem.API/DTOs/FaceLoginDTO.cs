using System.Collections.Generic;

namespace PunchInSystem.API.DTOs;

public class FaceLoginRequest
{
    public List<float> FaceDescriptor { get; set; } = new();
}

public class FaceLoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime Expiration { get; set; }
    public string UserRole { get; set; } = "Employee";
    public object User { get; set; } = null!;
}
