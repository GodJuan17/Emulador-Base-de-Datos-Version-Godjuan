CREATE TABLE Empleado (
  id INTEGER PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE Familiar (
  empleado_id INTEGER NOT NULL,
  numero SMALLINT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  PRIMARY KEY (empleado_id, numero),
  CONSTRAINT familiar_empleado_fk FOREIGN KEY (empleado_id)
    REFERENCES Empleado(id) ON DELETE CASCADE
);
