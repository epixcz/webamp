import React from "react";
import ClickedDiv from "../ClickedDiv";
import * as Actions from "../../actionCreators";
import { useActionCreator } from "../../hooks";

const Minimize = React.memo(() => {
  const minimize = useActionCreator(Actions.minimize);
  return <ClickedDiv id="minimize" title="Minimize" onClick={minimize} />;
});

export default Minimize;
