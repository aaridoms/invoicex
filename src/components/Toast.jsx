import {Chip} from "@nextui-org/react";

export default function Toast() {
  return (
    <Chip color="warning" variant="dot">
      <span>Todos los campos tienen que estar rellenos</span>
    </Chip>
  )
}
