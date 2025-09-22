import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { AddNewProfileComponent } from './add-new-profile';

describe('AddNewProfileComponent', () => {
  let component: AddNewProfileComponent;
  let fixture: ComponentFixture<AddNewProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddNewProfileComponent, ReactiveFormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddNewProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.profileForm.get('designation')?.value).toBe('Senior UI/UX Designer');
    expect(component.profileForm.get('department')?.value).toBe('Design');
    expect(component.profileForm.get('team')?.value).toBe('UX');
    expect(component.profileForm.get('experience')?.value).toBe('6 Years');
  });

  it('should validate required fields', () => {
    component.profileForm.patchValue({
      designation: '',
      department: '',
      team: '',
      experience: ''
    });
    
    expect(component.profileForm.valid).toBeFalsy();
    expect(component.profileForm.get('designation')?.hasError('required')).toBeTruthy();
    expect(component.profileForm.get('department')?.hasError('required')).toBeTruthy();
  });

  it('should handle image upload', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = { target: { files: [mockFile] } };
    
    spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function() {
      this.onload({ target: { result: 'data:image/jpeg;base64,test' } });
    });
    
    component.onImageUpload(mockEvent);
    expect(component.selectedImage).toBe('data:image/jpeg;base64,test');
  });

  it('should get correct step class', () => {
    component.currentStep = 2;
    expect(component.getStepClass(1)).toBe('step-completed');
    expect(component.getStepClass(2)).toBe('step-current');
    expect(component.getStepClass(3)).toBe('step-pending');
  });
});