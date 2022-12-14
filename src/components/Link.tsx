//link component
export default function Link(props) {
  return (
    <a
      href={props?.to || "#"} //replace spaces with dashes
      class={props?.class}
    >
      {props?.children}
    </a>
  );
}