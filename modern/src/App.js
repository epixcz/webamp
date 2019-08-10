import React from "react";
import JSZip from "jszip";
import "./App.css";
import * as Utils from "./utils";
import initialize from "./initialize";
import System from "./runtime/System";
import runtime from "./runtime";
import { run } from "./maki-interpreter/virtualMachine";
// import simpleSkin from "../skins/simple.wal";
import cornerSkin from "../skins/CornerAmp_Redux.wal";

async function getSkin() {
  const resp = await fetch(cornerSkin);
  // const resp = await fetch(simpleSkin);
  const blob = await resp.blob();
  const zip = await JSZip.loadAsync(blob);
  const skinXml = await Utils.inlineIncludes(
    await Utils.readXml(zip, "skin.xml"),
    zip
  );

  return await initialize(zip, skinXml);
}

function handleMouseEventDispatch(node, event, eventName) {
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  node.js_trigger(eventName, x, y);
}

function handleMouseButtonEventDispatch(
  node,
  event,
  leftEventName,
  rightEventName
) {
  handleMouseEventDispatch(
    node,
    event,
    event.button === 2 ? rightEventName : leftEventName
  );
}

function GuiObjectEvents({ node, children }) {
  return (
    <div
      onMouseDown={e =>
        handleMouseButtonEventDispatch(
          node,
          e,
          "onLeftButtonDown",
          "onRightButtonDown"
        )
      }
      onMouseUp={e =>
        handleMouseButtonEventDispatch(
          node,
          e,
          "onLeftButtonUp",
          "onRightButtonUp"
        )
      }
      onDoubleClick={e =>
        handleMouseButtonEventDispatch(
          node,
          e,
          "onLeftButtonDblClk",
          "onRightButtonDblClk"
        )
      }
      onMouseMove={e => handleMouseEventDispatch(node, e, "onMouseMove")}
      onMouseEnter={e => handleMouseEventDispatch(node, e, "onEnterArea")}
      onMouseLeave={e => handleMouseEventDispatch(node, e, "onLeaveArea")}
      onDragEnter={e => node.js_trigger("onDragEnter")}
      onDragLeave={e => node.js_trigger("onDragLeave")}
      onDragOver={e => handleMouseEventDispatch(node, e, "onDragOver")}
      onKeyUp={e => node.js_trigger("onKeyUp", e.keyCode)}
      onKeyDown={e => node.js_trigger("onKeyDown", e.keyCode)}
    >
      {children}
    </div>
  );
}

function Container(props) {
  const { id, children, default_x, default_y, default_visible } = props;
  const style = {
    position: "absolute",
  };
  if (default_x !== undefined) {
    style.left = Number(default_x);
  }
  if (default_y !== undefined) {
    style.top = Number(default_y);
  }
  if (default_visible !== undefined) {
    style.display = default_visible ? "block" : "none";
  }
  return (
    <div data-node-type="container" data-node-id={id} style={style}>
      {children}
    </div>
  );
}

function Layout({
  node,
  id,
  background,
  desktopalpha,
  drawBackground,
  minimum_h,
  maximum_h,
  minimum_w,
  maximum_w,
  droptarget,
  children,
}) {
  if (background == null) {
    console.warn("Got a Layout without a background. Rendering null", id);
    return null;
  }

  const image = node.js_imageLookup(background);
  if (image == null) {
    console.warn("Unable to find image to render. Rendering null", background);
    return null;
  }

  return (
    <>
      <img
        data-node-type="layout"
        data-node-id={id}
        src={image.imgUrl}
        draggable={false}
        style={{
          minWidth: minimum_w == null ? null : Number(minimum_w),
          minHeight: minimum_h == null ? null : Number(minimum_h),
          maxWidth: maximum_w == null ? null : Number(maximum_w),
          maxHeight: maximum_h == null ? null : Number(maximum_h),
          position: "absolute",
        }}
      />
      {children}
    </>
  );
}

function Layer({ node, id, image, children, x, y }) {
  if (image == null) {
    console.warn("Got an Layer without an image. Rendering null", id);
    return null;
  }
  const img = node.js_imageLookup(image.toLowerCase());
  if (img == null) {
    console.warn("Unable to find image to render. Rendering null", image);
    return null;
  }
  const params = {};
  if (x !== undefined) {
    params.left = Number(x);
  }
  if (y !== undefined) {
    params.top = Number(y);
  }
  if (img.x !== undefined) {
    params.backgroundPositionX = -Number(img.x);
  }
  if (img.y !== undefined) {
    params.backgroundPositionY = -Number(img.y);
  }
  if (img.w !== undefined) {
    params.width = Number(img.w);
  }
  if (img.h !== undefined) {
    params.height = Number(img.h);
  }
  return (
    <>
      <img
        data-node-type="Layer"
        data-node-id={id}
        src={img.imgUrl}
        draggable={false}
        style={{ position: "absolute", ...params }}
      />
      {children}
    </>
  );
}

function Button({
  id,
  image,
  action,
  x,
  y,
  downImage,
  tooltip,
  node,
  children,
}) {
  const [down, setDown] = React.useState(false);
  const imgId = down && downImage ? downImage : image;
  if (imgId == null) {
    console.warn("Got a Button without a imgId. Rendering null", id);
    return null;
  }
  // TODO: These seem to be switching too fast
  const img = node.js_imageLookup(imgId);
  if (img == null) {
    console.warn("Unable to find image to render. Rendering null", image);
    return null;
  }

  return (
    <div
      data-node-type="button"
      data-node-id={id}
      onMouseDown={e => {
        setDown(true);
        document.addEventListener("mouseup", () => {
          // TODO: This could be unmounted
          setDown(false);
        });
      }}
      onClick={e => {
        if (e.button === 2) {
          node.js_trigger("onRightClick");
        } else {
          node.js_trigger("onLeftClick");
        }
      }}
      title={tooltip}
      style={{
        position: "absolute",
        top: Number(y),
        left: Number(x),
        backgroundPositionX: -Number(img.x),
        backgroundPositionY: -Number(img.y),
        width: Number(img.w),
        height: Number(img.h),
        backgroundImage: `url(${img.imgUrl})`,
      }}
    >
      {children}
    </div>
  );
}

function ToggleButton(props) {
  return <Button data-node-type="togglebutton" {...props} />;
}

function Group(props) {
  const { id, children, x, y } = props;
  const style = {
    position: "absolute",
  };
  if (x !== undefined) {
    style.left = Number(x);
  }
  if (y !== undefined) {
    style.top = Number(y);
  }
  return (
    <div data-node-type="group" data-node-id={id} style={style}>
      {children}
    </div>
  );
}

const NODE_NAME_TO_COMPONENT = {
  container: Container,
  layout: Layout,
  layer: Layer,
  button: Button,
  togglebutton: ToggleButton,
  group: Group,
};

// Given a skin XML node, pick which component to use, and render it.
function XmlNode({ node }) {
  const attributes = node.attributes;
  const name = node.name;
  if (name == null || name === "groupdef") {
    // name is null is likely a comment
    return null;
  }
  const Component = NODE_NAME_TO_COMPONENT[name];
  const childNodes = node.children || [];
  const children = childNodes.map(
    (childNode, i) => childNode.visible && <XmlNode key={i} node={childNode} />
  );
  if (Component == null) {
    console.warn("Unknown node type", name);
    if (childNodes.length) {
      return <>{children}</>;
    }
    return null;
  }
  return (
    <GuiObjectEvents node={node}>
      <Component node={node} {...attributes}>
        {children}
      </Component>
    </GuiObjectEvents>
  );
}

function App() {
  const [data, setData] = React.useState(null);
  React.useEffect(() => {
    getSkin().then(async root => {
      // Execute scripts
      await Utils.asyncTreeFlatMap(root, node => {
        switch (node.name) {
          case "groupdef": {
            // removes groupdefs from consideration (only run scripts when actually referenced by group)
            return {};
          }
          case "script": {
            // TODO: stop ignoring standardframe
            if (node.attributes.file.endsWith("standardframe.maki")) {
              break;
            }
            const scriptGroup = Utils.findParentNodeOfType(node, [
              "group",
              "WinampAbstractionLayer",
              "WasabiXML",
            ]);
            const system = new System(scriptGroup);
            run({
              runtime,
              data: node.js_annotations.script,
              system,
              log: false,
            });
            return node;
          }
          default: {
            return node;
          }
        }
      });

      setData(root);
    });
  }, []);
  if (data == null) {
    return <h1>Loading...</h1>;
  }
  const root = data;

  return <XmlNode node={root} />;
}

export default App;