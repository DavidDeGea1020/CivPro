# Adaptive card  
  
  
{  
  type: "AdaptiveCard",  
  '$schema': "http://adaptivecards.io/schemas/adaptive-card.json",  
  version: "1.5",  
  body: [  
    {  
      type: "TextBlock",  
      text: If(Topic.varMatchMethod = "description",  
        "Based on your description, these jobs look closest. Which one did you mean?",  
        "I found a few close matches. Which one did you mean?"),  
      wrap: true,  
      weight: "Bolder"  
    },  
    {  
      type: "Input.ChoiceSet",  
      id: "selectedJobCode",  
      style: "expanded",  
      wrap: true,  
      choices: ForAll(Topic.vartblMatches,  
        {  
          title: ThisRecord.jobTitle & If(IsBlank(ThisRecord.purposeSnippet), "", " — " & ThisRecord.purposeSnippet),  
          value: ThisRecord.jobCode  
        })  
    }  
  ],  
  actions: [  
    { type: "Action.Submit", title: "Select", data: { cardAction: "select" } },  
    { type: "Action.Submit", title: "None of these", data: { cardAction: "none" } }  
  ]  
}  
