# Card message  
  
"I found a few close matches:" & Char(10) & Char(10) &  
Concat(Topic.vartblMatches, "• " & ThisRecord.jobTitle & If(IsBlank(ThisRecord.purposeSnippet), "", " — " & ThisRecord.purposeSnippet), Char(10))  
