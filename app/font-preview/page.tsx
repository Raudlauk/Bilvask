import Home from '../page';
import styles from './preview.module.css';

export default function FontPreview(){
 return <div>
  <div className={styles.banner}><span><strong>Steam / Studio preview</strong> · Supreme</span><a href="/" target="_blank" rel="noopener noreferrer">Compare with current site ↗</a></div>
  <Home slideBooking/>
 </div>;
}
