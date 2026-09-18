# Display JD  
  
"**" & Global.varWorkingJD.JobTitle & "**" & Char(10) & Char(10) &  
"**Salary/Hourly:** " & Coalesce(Global.varWorkingJD.PayType, "—") & Char(10) &  
"**People management:** " & Coalesce(Global.varWorkingJD.PeopleManagement, "—") & Char(10) &  
"**Sales/Non-Sales:** " & Coalesce(Global.varWorkingJD.SalesDesignation, "—") & Char(10) &  
"**Relationship manager:** " & Coalesce(Global.varWorkingJD.RelationshipManager, "—") & Char(10) &  
"**NMLS required:** " & Coalesce(Global.varWorkingJD.NMLSRequired, "—") & Char(10) & Char(10) &  
"**Purpose**" & Char(10) & Coalesce(Global.varWorkingJD.Purpose, "—") & Char(10) & Char(10) &  
"**Principal duties and responsibilities**" & Char(10) & Coalesce(Global.varWorkingJD.PrincipalDuties, "—") & Char(10) & Char(10) &  
"**Education requirements**" & Char(10) & Coalesce(Global.varWorkingJD.EducationRequirements, "—") & Char(10) & Char(10) &  
"**Work experience requirements**" & Char(10) & Coalesce(Global.varWorkingJD.WorkExperienceRequirements, "—") & Char(10) & Char(10) &  
"**Knowledge, skills and abilities**" & Char(10) & Coalesce(Global.varWorkingJD.KSAs, "—") & Char(10) & Char(10) &  
"**Certifications/licenses**" & Char(10) & Coalesce(Global.varWorkingJD.CertificationsLicenses, "—")  
