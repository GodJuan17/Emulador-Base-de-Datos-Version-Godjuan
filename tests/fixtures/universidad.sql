CREATE TABLE Estudiante (
  id INTEGER PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE Materia (
  id INTEGER PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE Matricula (
  estudiante_id INTEGER NOT NULL REFERENCES Estudiante(id),
  materia_id INTEGER NOT NULL REFERENCES Materia(id),
  calificacion NUMERIC(4, 2),
  PRIMARY KEY (estudiante_id, materia_id)
);
