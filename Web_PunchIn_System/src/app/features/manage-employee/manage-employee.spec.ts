import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ManageEmployee } from './manage-employee';

describe('ManageEmployee', () => {
  let component: ManageEmployee;
  let fixture: ComponentFixture<ManageEmployee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageEmployee]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageEmployee);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
