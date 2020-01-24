import { inspect } from 'util';
import bulletin from './queries/bulletin';
import singleValue from './queries/single-value';
import lineChart from './queries/line-chart';

function prettyPrint(obj) {
  return inspect(obj, false, 10000, true);
}

(async () => {

  // const d = await bulletin();
  // console.log(prettyPrint(d));
  
  const d = await lineChart();
  console.log(prettyPrint(d));
  
  // const v = await singleValue();
  // console.log(prettyPrint(v));
})();
