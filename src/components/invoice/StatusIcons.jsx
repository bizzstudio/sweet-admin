import { 
  MdCancel, 
  MdLocalShipping, 
  MdPendingActions, 
  MdCheckCircle,
  MdFactory,
  MdInventory 
} from 'react-icons/md';

const statusIcons = {
  'Cancel': MdCancel,
  'Likut': MdInventory,
  'Processing': MdFactory,
  'Pending': MdPendingActions,
  'Delivered': MdCheckCircle,
  getStatusIcon: (status) => {
    return statusIcons[status] || MdFactory;
  }
};

export default statusIcons; 