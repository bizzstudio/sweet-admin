import { Badge } from "@windmill/react-ui";

const Status = ({ status }) => {
  const getStatusComponent = (status) => {
    if(status?.name === "Pending" || status?.name === "Inactive")  
      return <Badge type="neutral">{status.heName}</Badge>
    else if (status?.name === "Processing")
       return <Badge type="warning">{status.heName}</Badge>
    else if (status?.name === "Delivered" || status?.name === "Active") 
      return <Badge type="success">{status.heName}</Badge>
    else if (status?.name === "Cancel")
      return <Badge type="danger">{status.heName}</Badge>
    else if (status?.name === "Likut")
      return <Badge type="warning">{status.heName}</Badge>
    // הזמנה שנקלטה מהמייל/ווצאפ ולא נקראה במלואה. חייבת להיראות כתקלה
    // ברשימת ההזמנות — כל המטרה שלה היא שמישהו ישים לב אליה
    else if (status?.name === "IngestionError")
      return <Badge type="danger">{status.heName}</Badge>
    // הזמנה שיובאה מקובץ ההיסטוריה של ההנהח"ש. אין בה מה לעשות — הסחורה
    // יצאה והחשבונית הופקה מזמן — ולכן היא נראית ניטרלית ולא כמשימה פתוחה
    else if (status?.name === "Archive")
      return <Badge type="neutral">{status.heName}</Badge>
    else{
      return <Badge type="primary">{status.heName}</Badge>
    }
    
  }
  return (
    <>
      <span className="font-serif">
        {getStatusComponent(status)}
      </span>
    </>
  );
};

export default Status;
