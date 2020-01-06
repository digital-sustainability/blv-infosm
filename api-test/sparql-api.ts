import { inspect } from 'util';
import bulletin from './helpers/bulletin';
import singleValue from './helpers/single-value';

function prettyPrint(obj) {
  return inspect(obj, false, 10000, true);
}

(async () => {

  const d = await bulletin();
  console.log(prettyPrint(d));
  
  // const v = await singleValue();
  // console.log(prettyPrint(v));
})();
