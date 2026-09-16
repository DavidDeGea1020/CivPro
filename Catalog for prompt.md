# Catalog for prompt  
  
concat(item()?['Job_x0020_Code'], ' | ', item()?['Title'], ' | ', replace(if(greater(length(coalesce(item()?['Purpose'], '')), 150), substring(item()?['Purpose'], 0, 150), coalesce(item()?['Purpose'], '')), decodeUriComponent('%0A'), ' '))  
