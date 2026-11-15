import test from "node:test";
import assert from "node:assert/strict";
import {
  findMunicipality,
  findProvince,
  listMunicipalities,
  listProvinces,
  UNASSIGNED,
} from "../src/lib/geo/boundaries";

test("resolves known points to their real Cochabamba province and municipality", () => {
  // Plaza principal de Cochabamba.
  assert.equal(findProvince(-17.3935, -66.157), "Cercado");
  assert.equal(findMunicipality(-17.3935, -66.157), "Cochabamba");

  // Villa Tunari, en el trópico de Cochabamba (provincia Chapare).
  assert.equal(findProvince(-17, -66), "Chapare");
  assert.equal(findMunicipality(-17, -66), "Villa Tunari");
});

test("points outside the Cochabamba department are left unassigned", () => {
  assert.equal(findProvince(0, 0), UNASSIGNED);
  assert.equal(findMunicipality(0, 0), UNASSIGNED);
});

test("the boundary catalog matches Cochabamba's real administrative counts", () => {
  assert.equal(listProvinces().length, 16);
  assert.equal(listMunicipalities().length, 47);
});
